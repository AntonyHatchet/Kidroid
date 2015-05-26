/**
 * Created by anton_gorshenin on 22.05.2015.
 */

module.exports = function (server) {
    var user = require('../routes/users.js');
    var io = require('socket.io').listen(server);

    io.on('connection', function (socket) {

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
        socket.on('getDevices', function (params) {

                user.getDevice(function (err, Devices) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('displayData', Devices);
                }, params);

            }
        );

        socket.on('createCategory', function (categoryName) {

                user.createCategory(categoryName, function (err, category) {
                    if (err) {
                        console.log(err);
                    }
                    console.log(category,"category callback");
                    io.emit('category', category);
                });
            }
        );
        socket.on('createDevice', function (paramsDevice) {

                user.createCategory(paramsDevice, function (err, params) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('category', params);
                });
            }
        );
        socket.on('createUser', function (userData) {

                user.createUser(userData, function (err, cb) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('userCreated', cb);
                });
            }
        );

        //Отключение пользователя
        socket.on('disconnect', function () {
                console.log('user disconnected');
            }
        );
    });
};