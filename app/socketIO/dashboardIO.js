/**
 * Created by anton_gorshenin on 22.05.2015.
 */

module.exports = function (server) {
    var user = require('../routes/users.js');
    var cron = require('../dbMagic/cronMagic.js');
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
                user.getDevice(function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('displayData', callback);
                },params);
            }
        );
        socket.on('getDevicesQuantityByParams', function (params) {
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
                    io.emit('allDeviceCreated', callback);
                },function(err,end){
                    if (err)throw err;
                    if (end){
                    io.emit("allDeviceCreated", "Finish")
                        }
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
        socket.on('updateDevice', function (params) {
                user.updateDevice(params, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('displayData', callback);
                });
            }
        );
        socket.on('getDeviceForSchedule', function (params) {
                cron.newScheduleDevice(params, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('deviceScheduled', callback);
                });
            }
        );
        socket.on('createSchedule', function (params) {
                cron.newSchedule(params, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('allSchedule', callback);
                });
            }
        );
        socket.on('updateSchedule', function (params) {
                cron.updateSchedule(params, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('allSchedule', callback);
                });
            }
        );
        socket.on('checkScheduleStatus', function (id) {
                cron.checkScheduleStatus(id, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('deviceScheduled', callback);
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