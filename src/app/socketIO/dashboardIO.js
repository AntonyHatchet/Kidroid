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
                io.to(socket.id).emit('userName', data.local.name);
            });
        }
        user.findFilter(function (err, callback) {
            if (err) {
                console.log(err);
            }
            io.to(socket.id).emit('filters', callback);
        });
        user.getAllDeviceQuantity(function (err, data) {
            if (err) {
                console.log(err);
            }
            io.to(socket.id).emit('quantity', data);
        });
        user.getDevice(function (err, data) {
            if (err) {
                console.log(err);
            }
            io.to(socket.id).emit('displayData', data);
        });
        user.findAllVersion(function (err, data) {
            if (err) {
                console.log(err);
            }
            io.to(socket.id).emit('version', data);
            io.to(socket.id).emit('getVersionDeploy', data);
        });
        device.findAllStatus(function (err, data) {
            if (err) {
                console.log(err);
            }
            io.to(socket.id).emit('status', data);
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
        user.getAllLists(function (err, Lists) {
            if (err) throw new Error(err);
            if (Lists){
                io.emit('FirewallList', Lists);
            }
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
        // ������� ���������
        socket.on('createFilter', function (filterParams,callback) {
                user.createFilter(filterParams, function (err, filters) {
                    if (err) {
                        console.log(err);
                    }
                    console.log(filters);
                    if (filters === "Filter already exists"){
                        callback(null,false)
                    }else{
                        callback(null,true)
                    }
                        io.emit('filters', filters);
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
        socket.on('getFilter', function (data,callback) {
                user.findFilter(function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    callback(null, data)
                    //console.log(data)
                    //io.to(socket.id).emit('getFilterBack', data);
                },data);
            }
        );
        socket.on('getCategory', function () {
                user.findCategory(function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    io.to(socket.id).emit('getCategoryCallback', data);
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
                },null,limit);
            }
        );
        socket.on('getDevicesByParams', function (params) {
                user.getDevice(function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    io.to(socket.id).emit('displayData', callback);
                    io.to(socket.id).emit('deviceForDeploy', callback);
                },params);
            }
        );
        socket.on('getDevicesQuantityByParams', function (params) {
                user.getAllDeviceQuantity(function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    console.log(callback);
                    io.to(socket.id).emit('quantity', callback);
                },params);
            }
        );
        socket.on('getDevicesQuantityByParams', function (params) {
                user.getAllDeviceQuantity(function (err, callback) {
                    if (err) {
                        console.log(err);
                    }
                    console.log(callback);
                    io.to(socket.id).emit('quantity', callback);
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
        // Firewall rules
        socket.on('saveAccessState', function(accessParams,callback){
            user.changeFirewallState(accessParams,function (err, message) {
                if (err) throw new Error(err);
                callback(null, message);
            });
        });
        socket.on('addBlackList', function(IP,callback){
            user.blackList(IP,function (err, message) {
                if (err) throw new Error(err);
                console.log(message, "addBlackList");
                socket.emit('getAllFirewallList', null);
                callback(null, message);
            });
        });
        socket.on('addWhiteList', function(IP,callback){
            user.whiteList(IP,function (err, message) {
                if (err) throw new Error(err);
                console.log(message, "addWhiteList");
                socket.emit('getAllFirewallList', null);
                callback(null, message);
            });
        });
        socket.on('removeIP', function(IP,callback){
            user.removeIpFromLists(IP,function (err, message) {
                if (err) throw new Error(err);
                console.log(message, "removeIP");
                socket.emit('getAllFirewallList', null);
                callback(null, message);
            });
        });
        socket.on('getAllFirewallList', function(){
            user.getAllLists(function (err, Lists) {
                if (err) throw new Error(err);
                if (Lists){
                    io.emit('FirewallList', Lists);
                }
            });
        });
        socket.on('saveFile', function(){
            console.log("saveFile")
            user.saveFirewallLists();
        });
        //user disconnect
        socket.on('disconnect', function () {
                console.log('user disconnected');
            }
        );
    });
};