/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var Device = require('../models/apk');

module.exports = {
    getAllDevice: function(callback){
        var query = Device.find();
        query.exec(function (err, Devices) {
            // Execute callback
            callback(null, Devices);
        });
    },
    saveDevice: function(deviceInfo, callback){
        var newDevice = new Device({
            device: {
                school: deviceInfo.school,
                timestamp: deviceInfo.date,
                device_id: deviceInfo.deviceID,
                token: deviceInfo.deviceToken,
                apk_version: deviceInfo.apk,
                name: deviceInfo.name,
                comment: deviceInfo.comment
            }
        });
        newDevice.save(function(err) {
            if (err) {throw err;}
            // Execute callback passed from route
            callback(null, newDevice);
        });
    },
    getDeviceId: function(callback){
        var find = Device.find();
        find.exec(function (err, id) {
            if (err) {throw err;}
            // Execute callback
            console.log(id,"asdasdasdadsadasdasdasdasdasdasdasdasdasdasdasd");
            id = id.length += 1;
            callback(null, id);
        });
    },
    getDeviceToken: function(callback){
        var token = Math.random().toString(36).substr(13);
        callback(null, token);
    }
};