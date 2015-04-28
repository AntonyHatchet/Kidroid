/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var Device = require('../models/apk');

module.exports = {
    getAllDevice: function (callback) {
        var query = Device.find();
        query.exec(function (err, Devices) {
            // Execute callback
            callback(null, Devices);
        });
    },
    regDevice: function (id, callback) {
        var device = Device;
        device.findOne({"device_id": id.id, "registered": false}, function (err, device) {
            if (err) throw err;
            callback(null, device);
        });
    },authDevice: function (deviceInfo, callback) {
        var device = Device;
        device.findOne({"device_id": deviceInfo.id, "token": deviceInfo.token, "registered":true}, function (err, device) {
            if (err) return console.log(err);
            callback(null, device);
        });
    },
    findVersion: function (deviceInfo, callback) {
        var device = Device;
        device.findOne({"device_id": deviceInfo.id}, {
            "_id": 1,
            "apk_version": 1
        }, function (err, device) {
            if (err) return console.log(err);
            callback(null, device);
        });
    },
    saveDevice: function (deviceInfo, callback) {
        var newDevice = new Device({
                school      : deviceInfo.school,
                timestamp   : deviceInfo.timestamp,
                device_id   : deviceInfo.deviceID,
                registered  : deviceInfo.registered,
                apk_version : deviceInfo.apk

        });
        newDevice.save(function (err) {
            if (err) {
                throw err;
            }
            // Execute callback passed from route
            callback(null, newDevice);
        });
    },

    registrDevice: function (deviceInfo, callback) {
        Device.findOne({"device_id": deviceInfo.id,"registered":false}, function(err, device){
            if (err) {
                throw err;
            }
            if (device != null ){
                var token = Math.random().toString(36).substr(13);
                console.log('No err!', device);
                var update = {
                    "timestamp" : new Date(),
                    "token"     : token,
                    "registered": true
                };
                Device.update({"device_id": deviceInfo.id}, {$set: update}, {upsert: true}, function (err, updated) {
                    if (err) {
                        console.log("not updated", err);
                    }
                    if (updated != null )
                    console.log("updated", updated);
                    // Execute callback passed from route
                    callback(token)
                });
            }
            console.log("find err",err);
            callback(err);
        });

    },

    updateDevice: function (deviceInfo, callback) {
        //Поиск в БД, ID полученного из запроса
        Device.findOne({"device_id": deviceInfo.id}, function(err, device){
            if (err) {
                throw err;
            }
            if (device != null ){
                // Нашли такой ID, создаем дату для записи в БД.
                console.log('No err!',device);
                var update = {
                        "timestamp"     : new Date(),
                        "latitude"      : [deviceInfo.latitude],
                        "longitude"     : [deviceInfo.longitude],
                        "loader_version": deviceInfo.loader_version
                };
                //Пишем в БД к ID из запроса
                Device.update({"device_id": deviceInfo.id }, {$set: update},{ upsert: true }, function (err, updated) {
                    if (err) {
                        console.log("not updated", err);
                    }
                    console.log("updated", updated);
                    // Execute callback passed from route
                });
            }
            console.log("find err",err);
            callback(err);
        });

    },
    createDeviceId: function (callback) {
        var find = Device.find();
        find.exec(function (err, id) {
            if (err) {
                throw err;
            }
            // Execute callback
            id = id.length += 1;
            callback(null, id);
        });
    }
};