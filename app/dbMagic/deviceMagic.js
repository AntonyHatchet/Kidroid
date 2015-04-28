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
    authDevice: function (deviceInfo, callback) {
        var device = Device;
        device.findOne({"device.device_id": deviceInfo.id, "device.token": deviceInfo.token}, function (err, device) {
            if (err) return console.log(err);
            callback(null, device);
        });
    },
    findVersion: function (deviceInfo, callback) {
        var device = Device;
        device.findOne({"device.device_id": deviceInfo.id}, {
            "_id": 1,
            "device.apk_version": 1
        }, function (err, device) {
            if (err) return console.log(err);
            callback(null, device);
        });
    },
    saveDevice: function (deviceInfo, callback) {
        var newDevice = new Device({
            device: {
                school: deviceInfo.school,
                timestamp: deviceInfo.timestamp,
                device_id: deviceInfo.deviceID,
                token: deviceInfo.deviceToken,
                apk_version: deviceInfo.apk,
                name: deviceInfo.name,
                comment: deviceInfo.comment
            }
        });
        newDevice.save(function (err) {
            if (err) {
                throw err;
            }
            // Execute callback passed from route
            callback(null, newDevice);
        });
    }, updateDevice: function (deviceInfo, callback) {
        Device.findOne({"device.device_id": deviceInfo.id}, function(err, device){
            if (err) {
                throw err;
            }
            if (device != null ){
                console.log('No err!',device);
                var update = {
                        "device.timestamp"   : new Date(),
                        "device.apk_version" : deviceInfo.apk_version,
                        "device.latitude"    : [deviceInfo.latitude],
                        "device.longitude"   : [deviceInfo.longitude]
                };
                Device.update({"device.device_id": deviceInfo.id }, {$set: update}, function (err, updated) {
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
    },
    createDeviceToken: function (callback) {
        var token = Math.random().toString(36).substr(13);
        callback(null, token);
    }
};