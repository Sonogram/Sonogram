const path = require('path')
const pug = require('pug')
const WebSocket = require('ws');
// Load configuration from local config files
const conf = require('rc')('sonogram', {
    port: 8080,
    grammar: 'general'
});
const grammarBase = path.join(__dirname, 'grammar', 'langs')

let recognizer, editor;

function setRecognizer(ws) {
    console.log('Recognizer connected!')
    recognizer = ws

    // Process messages from the recognizer
    ws.on('message', msgStr => {
        const msg = JSON.parse(msgStr)
        switch (msg.action) {

            // The recognizer wants a specific grammar XML file
            // Must include a 'lang' and 'vars' parameter
            case 'requestGrammar':
                if ('lang' in msg) {
                    const grammar = pug.compileFile(path.join(grammarBase, msg.lang + '.pug'))(msg.vars)
                    ws.send(JSON.stringify({
                        action: 'grammar',
                        grammar
                    }))
                }
                else {
                    ws.send(JSON.stringify({
                        action: 'error',
                        message: 'Request grammar message must contain a `lang` key'
                    }))
                }
                break

            // The recognizer has identified some speech
            // Must include a 'speech' parameter
            case 'recognition':
                if (!editor)
                    console.warn('Recognizer input received, but no editor is connected!')
                else
                    editor.send(msg.speech)
                break
        }
    })
}

function setEditor(ws) {
    console.log('Editor connected!')
    editor = ws
}

const wss = new WebSocket.Server({port: conf.port});
/**
 * Wait for connection. Once we get one, wait for an identification message. If identification is successful, remove
 * the identification listener, and add new listeners for their role
 */
wss.on('connection', ws => {
    ws.on('message', awaitIdentification);

    function awaitIdentification(message) {
        try {
            const msg = JSON.parse(message)
            if (msg.action == 'identify') {
                if (msg.role == 'recognizer') {
                    setRecognizer(ws)
                    ws.removeListener('message', awaitIdentification)
                }
                else if (msg.role == 'editor') {
                    setEditor(ws)
                    ws.removeListener('message', awaitIdentification)
                }
                else
                    throw new Error
            }
        }
        catch (ex) {
            ws.send(JSON.stringify({
                type: 'error',
                message: `Invalid identification message. The first message sent to this server by a JSON object of the
                 form: 
                 {
                    "action": "identify",
                    "type": "editor" | "recognizer"
                 }`
            }))
        }
    }

});
