/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var Device = require('../models/device');

module.exports = {
    // Получаем из БД общее колличество записей
    getQuantity: function (callback,params) {
        if (params!=undefined) {
            var name = (isNaN(params.search))? {$regex: new RegExp(params.search, 'i')}:{$exists: true};
            var deviceId = (isNaN(params.search)) ? {$exists: true}:{$gte:+params.search};
            var school = params.category;
            var build=  +params.build;
            var status = params.status;
            var page = params.page;
            var limit = params.limit;
        }
        Device
            .count({})
            .where('name').equals((!name)?{$exists: true}:name)
            .where('deviceId').equals((!deviceId)?{$exists: true}:deviceId)
            .where('school').equals((!school)?{$exists: true}:school)
            .where('status').equals((!status)?{$exists: true}:status)
            .where('apk.build').equals((!build)?{$exists: true}:build)
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
        }).sort({deviceId:1});

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
            var deviceId = (isNaN(params.search)) ? {$exists: true}:{$gte:+params.search};
            var school = params.category;
            var build=  +params.build;
            var status = params.status;
            var page = params.page;
            var limit = params.limit;
            var sort = params.sort;
            console.log(sort)
        }
        Device
            .find({})
            .where('name').equals((!name)?{$exists: true}:name)
            .where('deviceId').equals((!deviceId)?{$exists: true}:deviceId)
            .where('school').equals((!school)?{$exists: true}:school)
            .where('status').equals((!status)?{$exists: true}:status)
            .where('apk.build').equals((!build)?{$exists: true}:build)
            .limit(10)
            .skip(page)
            .sort(sort)
            .select({})
            .exec(function (err, Devices) {
                if (err) return console.log(err,"getQuantity Device.count err");
                // Execute callback
                callback(null, Devices);
            });
    },
    // Проверка на наличее ID и флага не зарегестрирован в БД
    regDevice: function (id, callback) {

        var device = Device;

        device.findOne({"deviceId": id.id, "registered": false}, function (err, device) {
            if (err) return console.log(err,"regDevice device.findOne err");
            callback(null, device);
        });

    },
    //Авторизация планшета
    authDevice: function (deviceInfo, callback) {
        var device = Device;
        device.findOne({
            "deviceId": deviceInfo.id,
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
        device.findOne({"deviceId": +deviceInfo.id}, {
            "_id": 1,
            "apkToUpdate": 1
        }, function (err, device) {
            if (err) return console.log(err,"findVersion device.findOne err");
            callback(null, device);
        });
    },
    saveDevice: function (deviceInfo, callback) {
        var newDevice = new Device({
            school: deviceInfo.school,
            timestamp: new Date().getTime(),
            deviceId: deviceInfo.deviceID,
            registered: false,
            apkToUpdate:{
                version: deviceInfo.version,
                build: deviceInfo.build
            },
            apk: {
                version: 0,
                build: 0
            },
            loader: 0,
            "updateRequired": true,
            "status": "Unregistered",
            "name": "Test Name",
            "android": 4.4
        });
        newDevice.save(function (err) {
            if (err) return console.log(err,"saveDevice newDevice.save err");
            // Execute callback passed from route
            callback(null, newDevice);
        });
    },

    registrDevice: function (deviceInfo, callback) {
        Device.findOne({"deviceId": deviceInfo.id, "registered": false}, function (err, device) {
            if (err) return console.log(err,"registrDevice Device.findOne err");

            if (device != null) {
                var token = Math.random().toString(36).substr(13);
                var update = {
                    "timestamp": new Date(),
                    "token": token,
                    "registered": true,
                    "status":"Registered"
                };
                Device.update({"deviceId": deviceInfo.id}, {$set: update}, {upsert: true}, function (err, updated) {

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
        Device.findOne({"deviceId": deviceInfo.device_id}, function (err, device) {
            if (err) return console.log(err,"updateDevice Device.findOne err");

            if (device != null) {
                // Нашли такой ID, создаем дату для записи в БД.
                var update = {
                    "timestamp": new Date(),
                    "latitude": [deviceInfo.latitude],
                    "longitude": [deviceInfo.longitude],
                    "loader": deviceInfo.loader_version,
                    "apk.version": deviceInfo.apk_version,
                    "apk.build": deviceInfo.apk_build,
                    "update_required": false,
                    "online":true,
                    "android": +deviceInfo.android
                };

                //Пишем в БД к ID из запроса
                Device.update({"deviceId": deviceInfo.device_id}, {$set: update}, {upsert: true}, function (err, updated) {
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
    //TODO Переписать, сейчас возможны дубликаты при множественной генерации id
    createDeviceId: function (callback) {
        var find = Device.find();

       find.exec(function (err, id) {
           if (err) return console.log(err,"createDeviceId exec");

            // Execute callback
            id = (!id[id.length - 1])? id = 1:id[id.length - 1].deviceId += 1;
            callback(null,id)
        })
    },
    removeDevice: function (data, callback) {
        Device.remove({"deviceId": +data}, function (err, data) {

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