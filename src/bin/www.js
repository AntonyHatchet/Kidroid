var app = require('../app')[0];
var sessionMiddleware = require('../app')[1];
//var debug = require('debug')('Kidroid:server');
var http = require('http');
var fs = require('fs-extra');
var path = require('path');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

var io = require('../app/socketIO/dashboardIO.js')(server,sessionMiddleware);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
process.on('uncaughtException', function (event) {
    var options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    };
    var date = new Date().toLocaleString("ru",options);
    console.log(event);
    fs.readJson(path.join(__dirname +"/"+ date, 'logs.json'), function (err, packageObj) {
        if (err) {
            var errObject= {};
            errObject[new Date()]= event;
            fs.outputJson(path.join(__dirname +"/"+ date, 'logs.json'), errObject, function (err) {
                console.log(err)
            })
        }else if (!err)
        packageObj[new Date()] = event;
        fs.writeJson(path.join(__dirname +"/"+ date, 'logs.json'), packageObj, function (err) {
            console.log(err)
        })
    })

});

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        case 'ENOENT':
            console.error('ENOENT is already in use');
            //process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    //debug('Listening on ' + bind);
}
