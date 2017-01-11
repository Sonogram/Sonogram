const net = require('net')

const server  = new net.Server()
server.listen('\\\\?\\pipe\\sonogram', e => {
    console.log(e)
})
