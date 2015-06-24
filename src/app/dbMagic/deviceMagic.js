/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var Device = require('../models/device');

module.exports = {
    // Получаем из БД общее колличество записей
    getQuantity: function (callback,params) {
        if (params!=undefined) {
            console.log(params,"Find getQuantity")
            var name = (isNaN(params.search))? {$regex: new RegExp(params.search, 'i')}:{$exists: true};
            var _id = (isNaN(params.search)) ? {$exists: true}:{$gte:+params.search};
            var school = {$regex: new RegExp(params.school, 'i')};
            var filter = {$regex: new RegExp(params.filter2, 'i')};
            var apkBuild=  (isNaN(params.build.split(' ')[1])) ? {$exists: true}:{$gte:+(params.build.split(' ')[1])};
            var apkStatus=  (isNaN(params.build.split(' ')[1])) ? params.build :{$exists: true};
            var status = params.status;
            var loader = params.loader;
        }
        Device
            .count({})
            .where('name').equals((!name)?{$exists: true}:name)
            .where('_id').equals((!_id)?{$exists: true}:_id)
            .where('school').equals((!school)?{$exists: true}:school)
            .where('status').equals((!status)?{$exists: true}:status)
            .where('filter2').equals((!filter)?{$exists: true}:filter)
            .where('apk.build').equals((!apkBuild)?{$exists: true}:apkBuild)
            .where('loader').equals((!loader)?{$exists: true}:loader)
            .where('apkToUpdate.status').equals((!apkStatus)?{$exists: true}:apkStatus)
            .exec(function (err, Devices) {
                if (err) return console.log(err,"getQuantity Device.count err");
                // Execute callback
                callback(null, Devices);
            });
    },
    //Поиск устройств согласно запросам
    getAllDevice: function (callback) {
        Device.find({"online":true},function (err, Devices) {
            if (err) return console.log(err,"getAllDevice Device.find err");
            // Execute callback
            callback(null, Devices);
        }).sort({_id:1});

    },
    findAllStatus: function (callback) {
        Device.find("",{"_id":0,"status":1}, function (err, status) {

            if (err) return console.log(err,"findAllStatus Device.find err");

            if (status != null) {
                callback(null, status)
            }
        });
    },
    getDevice: function (callback,params) {
        if (params!=undefined) {
            var name = (isNaN(params.search))? {$regex: new RegExp(params.search, 'i')}:{$exists: true};
            var _id = (isNaN(params.search)) ? {$exists: true}:{$gte:+params.search};
            var school = {$regex: new RegExp(params.school, 'i')};
            var filter = {$regex: new RegExp(params.filter2, 'i')};
            var apkBuild=  (isNaN(params.build.split(' ')[1])) ? {$exists: true}:{$gte:+(params.build.split(' ')[1])};
            var apkStatus=  (isNaN(params.build.split(' ')[1])) ? params.build :{$exists: true};
            var status = params.status;
            var page = params.page;
            var limit = params.limit;
            var sort = params.sort;
            var loader = params.loader;

        }
        Device
            .find({})
            .where('name').equals((!name)?{$exists: true}:name)
            .where('_id').equals((!_id)?{$exists: true}:_id)
            .where('school').equals((!school)?{$exists: true}:school)
            .where('status').equals((!status)?{$exists: true}:status)
            .where('apk.build').equals((!apkBuild)?{$exists: true}:apkBuild)
            .where('apkToUpdate.status').equals((!apkStatus)?{$exists: true}:apkStatus)
            .where('filter2').equals((!filter)?{$exists: true}:filter)
            .where('loader').equals((!loader)?{$exists: true}:loader)
            .limit((!limit)?10:+limit)
            .skip(page)
            .sort(sort)
            .select({})
            .exec(function (err, Devices) {
                if (err) return console.log(err,"getQuantity Device.count err");
                // Execute callback
                callback(null, Devices);
            });
    },
    getDeviceId: function (callback,params) {
        if (params!=undefined) {
            console.log(params,"Find getDeviceId")
            var name = (isNaN(params.search))? {$regex: new RegExp(params.search, 'i')}:{$exists: true};
            var _id = (isNaN(params.search)) ? {$exists: true}:{$gte:+params.search};
            var school = {$regex: new RegExp(params.school, 'i')};
            var filter = {$regex: new RegExp(params.filter2, 'i')};
            if(params.build != undefined) {
                var apkBuild = (isNaN(params.build.split(' ')[1])) ? {$exists: true} : {$gte: +(params.build.split(' ')[1])};
                var apkStatus = (isNaN(params.build.split(' ')[1])) ? params.build : {$exists: true};
            }
            var status = params.status;
            var loader = params.loader;
        }
        Device
            .find({})
            .where('name').equals((!name)?{$exists: true}:name)
            .where('_id').equals((!_id)?{$exists: true}:_id)
            .where('school').equals((!school)?{$exists: true}:school)
            .where('filter2').equals((!filter)?{$exists: true}:filter)
            .where('status').equals((!status)?{$exists: true}:status)
            .where('apk.build').equals((!apkBuild)?{$exists: true}:apkBuild)
            .where('loader').equals((!loader)?{$exists: true}:loader)
            .where('apkToUpdate.status').equals((!apkStatus)?{$exists: true}:apkStatus)
            .select("-apkToUpdate -apk -school -timestamp -registered -loader -updateRequired -status -name -android -__v -longitude -latitude -token -filter2")
            .exec(function (err, Devices) {
                if (err) return console.log(err,"get_id Device.find err");
                // Execute callback
                var devicesArray = [];
                    for (i in Devices){
                        devicesArray.push(Devices[i]._id)
                    }
                callback(null,devicesArray)
            });
    },
    // Проверка на наличее ID и флага не зарегестрирован в БД
    regDevice: function (id, callback) {

        var device = Device;

        device.findOne({"_id": id.id, "registered": false}, function (err, device) {
            if (err) return console.log(err,"regDevice device.findOne err");
            callback(null, device);
        });

    },
    //Авторизация планшета
    authDevice: function (deviceInfo, callback) {
        var device = Device;
        device.findOne({
            "_id": deviceInfo.id,
            "token": deviceInfo.token,
            "registered": true
        }, function (err, device) {
            if (err) return console.log(err,"authDevice device.findOne err");
            callback(null, device);
        });
    },
    // Находим версию по ИД устройства
    findVersion: function (deviceInfo, callback) {
        var device = Device;
        device.findOne({"_id": +deviceInfo.id}, {
            "_id": 1,
            "apkToUpdate": 1,
            "task":1,
            "updateRequired":1,
            "kidroidToUpdate":1
        }, function (err, device) {
            if (err) return console.log(err,"findVersion device.findOne err");
            callback(null, device);
        });
    },
    saveDevice: function (deviceInfo, callback) {
        var newDevice = new Device({
            _id: deviceInfo._id,
            school: deviceInfo.school,
            timestamp: new Date().getTime(),
            registered: false,
            apkToUpdate:{
                build:  deviceInfo.build.split(' ')[1],
                version: deviceInfo.build.split(' ')[0],
                status: "Install scheduled"
            },
            apk: {
                version: 0,
                build: 0
            },
            loader: 0,
            "updateRequired": true,
            "status": "Unregistered",
            "name": "Test Name",
            "android": 4.4,
            "filter2": deviceInfo.filter2
        });
        newDevice.save(function (err) {
            if (err) return console.log(err,"saveDevice newDevice.save err");
            // Execute callback passed from route
            callback(null, newDevice);
        });
    },

    registrDevice: function (id, callback) {
        Device.findOne({"_id": id, "registered": false}, function (err, device) {
            if (err) return console.log(err,"registrDevice Device.findOne err");

            if (device != null) {
                var token = Math.random().toString(36).substr(13);
                var update = {
                    "timestamp": new Date(),
                    "token": token,
                    "registered": true,
                    "status":"Registered"
                };
                Device.update({"_id": id}, {$set: update}, {upsert: true}, function (err, updated) {

                    if (err) return console.log(err,"registrDevice Device.update err");

                    if (updated != null) {
                        // Execute callback passed from route
                        callback(null, token)
                    }
                });
            }
        });
    },

    updateDevice: function (deviceInfo, callback) {

        //Поиск в БД, ID полученного из запроса
        Device.findOne({"_id": deviceInfo.device_id}, function (err, device) {
            if (err) return console.log(err,"updateDevice Device.findOne err");

            if (device != null) {
                // Нашли такой ID, создаем дату для записи в БД.
                var update = {
                    "timestamp": new Date(),
                    "latitude": [+deviceInfo.latitude],
                    "longitude": [+deviceInfo.longitude],
                    "loader": deviceInfo.loader_version,
                    "apk.version": deviceInfo.apk_version,
                    "apk.build": deviceInfo.apk_build,
                    "updateRequired": false,
                    "status":"Online",
                    "android": +deviceInfo.android,
                    "apkToUpdate.status": "",
                    "name": deviceInfo.name
                };

                //Пишем в БД к ID из запроса
                Device.update({"_id": deviceInfo.device_id}, {$set: update}, {upsert: true}, function (err, updated) {
                    if (err) return console.log(err,"updateDevice Device.update err");
                    console.log("updated", updated);
                });
            }
            console.log("find err", err);
            callback(err);
        });

    },
    updateDeviceStatus: function (deviceInfo) {
        Device.update({"_id": deviceInfo}, {$set:{"online":false}}, function (err, updated) {
            if (err) return console.log(err,"updateDeviceStatus err");
            console.log("This device is offline status updated", updated);
        })
    },
    createDeviceId: function (callback) {
        var find = Device.find();

       find.exec(function (err, id) {
           if (err) return console.log(err,"create_id exec");

            // Execute callback
            id = (!id[id.length - 1])? id = 1:id[id.length - 1]._id += 1;
            callback(null,id)
        })
    },
    removeDevice: function (data, callback) {
        Device.remove({"_id": data.id}, function (err, data) {

            if (err) return console.log(err,"removeDevice err");

            if (data != null) {

                Device.find("", function (err, device) {

                    if (err) {
                        throw err;
                    }

                    if (device != null) {

                        callback(null, device)

                    }
                });
            }
        });
    }
};