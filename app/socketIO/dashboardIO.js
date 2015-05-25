/**
 * Created by anton_gorshenin on 22.05.2015.
 */

module.exports = function (server) {
    var user = require('../routes/users.js');
    var io = require('socket.io').listen(server);

    io.on('connection', function(socket){

        user.getAllDeviceQuantity(function (err, Quantity) {
            if (err) {
                console.log(err);
            }
            io.emit('quantity', Quantity);
        });
    //Стартовая отправка первых 10 планшетов
        user.getDevice(function (err, Devices) {
            if (err) {
                console.log(err);
            }
            io.emit('displayData', Devices);
        });

    // Запрос устройств на страницу по колличеству
        socket.on('getDevicesByCount', function(count){
                console.log(count,"count");
                user.getDevice(function (err, Devices) {
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