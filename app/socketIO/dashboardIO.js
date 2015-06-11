/**
 * Created by anton_gorshenin on 22.05.2015.
 */

module.exports = function (server,sessionMiddleware) {
    var user = require('../routes/users.js');
    var device = require('../routes/device.js');
    var cron = require('../dbMagic/cronMagic.js');
    var io = require('socket.io').listen(server);
    io.use(function(socket, next){
        sessionMiddleware(socket.request, {}, next);
    });
    io.on('connection', function (socket) {
        var userName;
        if(socket.request.session.passport.user != undefined) {
            console.log("user.findUser");
            user.findUser(socket.request.session.passport.user, function (err, data) {
                if (err) {
                    console.log(err);
                }
                userName = data.local.name;
                io.emit('userName', data.local.name);
            });
        }
        user.findFilter(function (err, callback) {
            if (err) {
                console.log(err);
            }
            io.emit('filters', callback);
        });
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
        //UPDATE
        socket.on('updateCategory', function (categoryParams) {

                user.updateCategory(categoryParams, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('category', callback);
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
        socket.on('updateSchedule', function (params) {
                cron.updateSchedule(params, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('allSchedule', callback);
                });
            }
        );
        //CREATE
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
        socket.on('createSchedule', function (params) {
                params.name = userName;
                cron.newSchedule(params, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('allSchedule', callback);
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
        socket.on('createFilter', function (filterData) {
                console.log(filterData);
                user.createFilter(filterData, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('filters', callback);
                });
            }
        );
        //GET
        socket.on('getCategory', function () {
                user.findCategory(function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('getCategoryCallback', data);
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
        //REMOVE
        socket.on('removeVersion', function (id) {
                for (var i = 0; i < id.length; i++) {
                    user.removeVersion(id[i], function (err, callback) {
                        if (err) {
                            console.log(err);
                        }
                        io.emit('displayData', callback);
                    });
                }
            }
        );
        socket.on('removeCategory', function (categoryID) {
                for (var i = 0; i < categoryID.length; i++) {
                    user.removeCategory(categoryID[i], function (err, callback) {
                        if (err) {
                            console.log(err);
                        }
                        io.emit('category', callback);
                    });
                }
            }
        );
        socket.on('removeUsers', function (userID) {
                for (var i = 0; i < userID.length; i++) {
                    user.removeUsers(userID[i], function (err, callback) {
                        if (err) {
                            console.log(err);
                        }
                        io.emit('users', callback);
                    });
                }
            }
        );
        socket.on('removeMarionetteAPK', function (apkID) {
                for (var i = 0; i < apkID.length; i++) {
                    user.removeMarionetteAPK(apkID[i], function (err, callback) {
                        if (err) {
                            console.log(err);
                        }
                        io.emit('users', callback);
                    });
                }
            }
        );
        //OTHER
        socket.on('checkScheduleStatus', function (id) {
                cron.checkScheduleStatus(id, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('deviceScheduled', callback);
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