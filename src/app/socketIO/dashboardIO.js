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
        var devicesToDeploy;
        if(socket.request.session.passport != undefined) {
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
        user.getDeviceIdByParams(function (err, callback) {
            if (err) {
                console.log(err,"getDeviceIdByParams first");
            }
            devicesToDeploy = callback;
        });
        //UPDATE
        socket.on('editCategory', function (categoryParams) {

                user.updateFilter(categoryParams, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('filters', callback);
                });
            }
        );

        socket.on('updateDevice', function (params) {
                console.log(params);
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
        socket.on('updateUser', function (params) {
                user.updateUserInfo(params, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('users', callback);
                });
            }
        );
        //CREATE
        // Создаем категорию
        socket.on('createFilter', function (filterParams) {
                user.createFilter(filterParams, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('filters', callback);
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

        socket.on('deployApk', function (data) {
                var deploy={};
                deploy.name = userName;
                deploy.date = new Date();
                deploy.devices = (data.devices.length !=0)?data.devices:devicesToDeploy;
                deploy.build = data.build;
                deploy.version = data.version;
                deploy.type = "Marionette APK";
                deploy.school = data.school;
                deploy.filter = data.filter;
                cron.newSchedule(deploy, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('allSchedule', callback);
                });
            }
        );
        socket.on('deployKidroid', function (version) {
                var deploy={};
                deploy.name = userName;
                deploy.date = new Date();
                deploy.devices = (version.devices.length !=0)?version.devices:devicesToDeploy;
                deploy.version = version.version;
                deploy.type = "Kidroid Loader";
                deploy.school = version.school;
                deploy.filter = version.filter;
                cron.newSchedule(deploy, function (err, callback) {
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
        //GET
        socket.on('getFilter', function (data) {
                user.findFilter(function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    console.log(data)
                    io.emit('getFilterBack', data);



                },data);
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
        socket.on('getDeviceForSchedule', function (params) {
                cron.newScheduleDevice(params, function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('deviceScheduled', callback);
                });
            }
        );
        socket.on('requestLogLimit', function (limit) {
                cron.getAllSchedule(function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('allSchedule', data);
                },null,limit); // отправляем Null как заглушку для переменной params
            }
        );
        // Запрос устройств на страницу по колличеству
        socket.on('getDevicesByParams', function (params) {
                console.log(params,"getDevicesByParams")
                user.getDevice(function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('displayData', callback);
                    io.emit('deviceForDeploy', callback);
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
        socket.on('removeFilters', function (data) {
                for (var i = 0; i < data.filters.length; i++) {
                    user.removeFilters({name:data.name,filter:data.filters[i]}, function (err, callback) {
                        if (err) {
                            console.log(err);
                        }
                        io.emit('filters', callback);
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
                        console.log(callback,"removeMarionetteAPK");
                        io.emit('version', callback);
                        io.emit('getVersionDeploy', callback);
                    });
                }
            }
        );
        socket.on('removeKidroidVersion', function (id) {
                for (var i = 0; i < id.length; i++) {
                    user.removeKidroid(id[i], function (err, callback) {
                        if (err) {
                            console.log(err);
                        }
                        console.log(callback,"removeKidroidVersion");
                        io.emit('version', callback);
                        io.emit('getVersionDeploy', callback);
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
        socket.on('makeDefaultVersion', function (params) {
                user.makeDefaultVersion(params,function (err, data) {
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