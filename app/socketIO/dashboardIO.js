/**
 * Created by anton_gorshenin on 22.05.2015.
 */

module.exports = function (server) {
    var user = require('../routes/users.js');
    var io = require('socket.io').listen(server);

    io.on('connection', function (socket) {

        user.getAllDeviceQuantity(function (err, data) {
            if (err) {
                console.log(err);
            }
            io.emit('quantity', data);
        });
        //Стартовая отправка первых 10 устройств
        user.getDevice(function (err, data) {
            if (err) {
                console.log(err);
            }
            io.emit('displayData', data);
        });

        user.findCategory(function (err, data) {
            if (err) {
                console.log(err);
            }
            io.emit('category', data);
        });

        user.findAllVersion(function (err, data) {
            if (err) {
                console.log(err);
            }
            //console.log('version',data);
            io.emit('version', data);
        });
        user.findAllUsers(function (err, data) {
            if (err) {
                console.log(err);
            }
            io.emit('users', data);
        });

        // Запрос устройств на страницу по колличеству
        socket.on('getDevicesByParams', function (params) {
                //console.log(params, "getDevicesByParams");
                user.getDevice(function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('displayData', callback);
                },params);
            }
        );
        socket.on('getDevicesQuantityByParams', function (params) {
                //console.log(params, "getDevicesByParams");
                user.getAllDeviceQuantity(function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    console.log(callback);
                    io.emit('quantity', callback);
                },params);
            }
        );
        // Создаем категорию
        socket.on('createCategory', function (categoryName) {

                user.createCategory(categoryName, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('category', callback);
                });
            }
        );
        socket.on('updateCategory', function (categoryParams) {

                user.updateCategory(categoryParams, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('category', callback);
                });
            }
        );
        socket.on('removeCategory', function (categoryID) {

                user.removeCategory(categoryID, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('category', callback);
                });
            }
        );
        socket.on('removeUsers', function (userID) {

                user.removeUsers(userID, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('users', callback);
                });
            }
        );
        socket.on('createDevice', function (paramsDevice) {
                //console.log(paramsDevice);
                user.createDevice(paramsDevice, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('displayData', callback);
                });
            }
        );
        socket.on('removeDevice', function (id) {
                //console.log(id);
                user.removeDevice(id, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('displayData', callback);
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