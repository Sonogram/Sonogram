// Imports
const path = require('path')
const pug = require('pug')
const WebSocket = require('ws');

// Load configuration from local config files
const conf = require('rc')('sonogram', {
    port: 8080,
    grammar: 'general'
});

// Directory containing all the grammar files
const grammarBase = path.join(__dirname, 'grammar', 'langs')
// The subscribed editors
const editors = []
// The server
const wss = new WebSocket.Server({port: conf.port});

wss.on('connection', ws => {
    ws.on('message', message => {
        const msg = JSON.parse(message)
        switch (msg.action) {

            // An editor wants to subscribe to commands
            case 'register':
                console.log('Editor connected!')
                editors.push(ws)
                break

            // The recognizer wants a specific grammar XML file
            // Must include a 'lang' and 'vars' parameter
            case 'requestGrammar':
                if ('lang' in msg) {
                    const grammar = pug.compileFile(path.join(grammarBase, msg.lang + '.pug'))(msg.vars)
                    ws.send(JSON.stringify({
                        action: 'grammar',
                        grammar
                    }))
                    console.log(`"${msg.lang}" grammar sent`)
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
                if (editors.length == 0)
                    console.warn('Recognizer input received, but no editor is connected!')
                else {
                    for (let editor of editors)
                        editor.send(msg.speech)
                    console.log(`"${msg.speech}" recognized and sent to ${editors.length} editor(s)`)
                }
                break
        }
    })
})
