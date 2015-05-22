/**
 * Created by anton_gorshenin on 22.05.2015.
 */

module.exports = function (server) {
    var io = require('socket.io').listen(server);
    io.on('connection', function(socket){
        console.log('a user connected');
        socket.on('disconnect', function(){
            console.log('user disconnected');});
        socket.on('test', function(){
                console.log('user test');
                io.emit('message', "test")}
        )
    });
};