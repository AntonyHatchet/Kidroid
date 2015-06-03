/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var Device = require('../models/device');

module.exports = {
    // Получаем из БД общее колличество записей
    getQuantity: function (callback,params) {
        var query = {};
        if (params!=undefined) {
            query.name = (isNaN(params.search))? {$regex: new RegExp(params.search, 'i')}:{$exists: true};
            query.device_id = (isNaN(params.search)) ? {$exists: true}:{$gte:+params.search};
            query.school = (!params.category) ? {$exists: true} : params.category;
            query.apk_version = (!params.version) ? {$exists: true} : params.version;
            query.online = (!params.status) ? {$exists: true} : params.status;
        }
        query = Device.count(query);
        query.exec(function (err, Devices) {
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
        }).sort({device_id:1});

    },
    getDevice: function (callback,params) {
        var query = {};
        if (params!=undefined) {
            var page = (!params.page)? "" : +params.page;
            query.name = (isNaN(params.search))? {$regex: new RegExp(params.search, 'i')}:{$exists: true};
            query.device_id = (isNaN(params.search)) ? {$exists: true}:{$gte:+params.search};
            query.school = (!params.category) ? {$exists: true} : params.category;
            query.apk_version = (!params.version) ? {$exists: true} : params.version;
            query.online = (!params.status) ? {$exists: true} : params.status;
        }
        query = Device.find(query).skip( page ).limit(10).sort({device_id:1});
        query.exec(function (err, Devices) {
            if (err) return console.log(err,"getDevice Device.find err");
            callback(null, Devices);
        });

    },
    // Проверка на наличее ID и флага не зарегестрирован в БД
    regDevice: function (id, callback) {

        var device = Device;

        device.findOne({"device_id": id.id, "registered": false}, function (err, device) {
            if (err) return console.log(err,"regDevice device.findOne err");
            callback(null, device);
        });

    },
    //Авторизация планшета
    authDevice: function (deviceInfo, callback) {
        var device = Device;
        device.findOne({
            "device_id": deviceInfo.id,
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
        device.findOne({"device_id": +deviceInfo.id}, {
            "_id": 1,
            "apk_to_update": 1
        }, function (err, device) {
            if (err) return console.log(err,"findVersion device.findOne err");
            callback(null, device);
        });
    },
    saveDevice: function (deviceInfo, callback) {
        var newDevice = new Device({
            school: deviceInfo.school,
            timestamp: new Date().getTime(),
            device_id: deviceInfo.deviceID,
            registered: false,
            apk_to_update: deviceInfo.update,
            apk_version: 0,
            loader_version: 0,
            "update_required": true,
            "online": false,
            "name": "Test Name",
            "android": 0
        });
        newDevice.save(function (err) {
            if (err) return console.log(err,"saveDevice newDevice.save err");
            // Execute callback passed from route
            callback(null, newDevice);
        });
    },

    registrDevice: function (deviceInfo, callback) {
        Device.findOne({"device_id": deviceInfo.id, "registered": false}, function (err, device) {
            if (err) return console.log(err,"registrDevice Device.findOne err");

            if (device != null) {
                var token = Math.random().toString(36).substr(13);
                var update = {
                    "timestamp": new Date(),
                    "token": token,
                    "registered": true
                };
                Device.update({"device_id": deviceInfo.id}, {$set: update}, {upsert: true}, function (err, updated) {

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
        Device.findOne({"device_id": deviceInfo.device_id}, function (err, device) {
            if (err) return console.log(err,"updateDevice Device.findOne err");

            if (device != null) {
                // Нашли такой ID, создаем дату для записи в БД.
                var update = {
                    "timestamp": new Date(),
                    "latitude": [deviceInfo.latitude],
                    "longitude": [deviceInfo.longitude],
                    "loader_version": deviceInfo.loader_version,
                    "apk_version": deviceInfo.apk_version,
                    "update_required": false,
                    "online":true,
                    "android": +deviceInfo.android
                };

                //Пишем в БД к ID из запроса
                Device.update({"device_id": deviceInfo.device_id}, {$set: update}, {upsert: true}, function (err, updated) {
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
            id = (!id[id.length - 1])? id = 1:id[id.length - 1].device_id += 1;
            callback(null,id)
        })
    },
    removeDevice: function (data, callback) {
        Device.remove({"device_id": +data}, function (err, data) {

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