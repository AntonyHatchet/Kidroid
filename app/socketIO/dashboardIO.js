/**
 * Created by anton_gorshenin on 22.05.2015.
 */

module.exports = function (server,sessionMiddleware) {
    var user = require('../routes/users.js');
    var device = require('../routes/device.js');
    var cron = require('../dbMagic/cronMagic.js');
    var io = require('socket.io').listen(server);
    var app = require('passport');
    io.use(function(socket, next){
        sessionMiddleware(socket.request, {}, next);
    });
    io.on('connection', function (socket) {
        var userId = socket.request.session.passport;
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
            io.emit('getVersionDeploy', data);
        });
        device.findAllStatus(function (err, data) {
            if (err) {
                console.log(err);
            }
            io.emit('status', data);
        });
        user.findAllUsers(function (err, data) {
            if (err) {
                console.log(err);
            }
            io.emit('users', data);
        });
        cron.getAllSchedule(function (err, data) {
            if (err) {
                console.log(err);
            }
            io.emit('allSchedule', data);
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
        socket.on('createFilter', function (filterData) {

                user.createFilter(filterData, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('filters', callback);
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
                user.createDevice(paramsDevice, function (err, allDevice,savedDevice) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('displayData', allDevice);
                    io.emit('allDeviceCreated', savedDevice);
                },function(err,end){
                    if (err)throw err;
                    if (end){
                    io.emit("allDeviceCreated", "Finish")
                        }
                });
            }
        );
        socket.on('removeDevice', function (id) {
                console.log(app.session.name);
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
        socket.on('getCategory', function () {
                user.findCategory(function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('getCategoryCallback', data);
                });
            }
        );
        socket.on('makeDefaultVersion', function (location,id) {
                user.makeDefaultVersion(location,id,function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('getVersionDeploy', data);
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