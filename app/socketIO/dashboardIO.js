/**
 * Created by anton_gorshenin on 22.05.2015.
 */

module.exports = function (server) {
    var user = require('../routes/users.js');
    var io = require('socket.io').listen(server);

    io.on('connection', function(socket){

    //Стартовая отправка первых 10 планшетов нужно переделать на использование сокета  getDevicesByCount
        user.getDeviceByCount(function (err, Devices) {
            if (err) {
                console.log(err);
            }
            io.emit('displayData', Devices);
        },10);

    // Запрос устройств на страницу по колличеству
        socket.on('getDevicesByCount', function(count){
                console.log(count,"count");
                user.getDeviceByCount(function (err, Devices) {
                       if (err) {
                           console.log(err);
                       }
                   io.emit('displayData', Devices);
               },count);
            }
        );
    //Отключение пользователя
        socket.on('disconnect', function(){
                console.log('user disconnected');}
        );
    });
};