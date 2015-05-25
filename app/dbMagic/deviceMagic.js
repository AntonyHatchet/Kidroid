/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var Device = require('../models/apk');

module.exports = {
    // Получаем из БД общее колличество записей
    getQuantity: function (callback) {
        var query = Device.count();
        query.exec(function (err, Devices) {
            // Execute callback
            console.log(Devices);
            callback(null, Devices);
        });
    },
    //Поиск устройств согласно запросам
    getDevice: function (callback,name,status,school,version) {

        var query = {};

        query.device_id = (!name)?{$exists:true}:name;
        query.registered = (!status)?{$exists:true}:status;
        query.school = (!school)?{$exists:true}:school;
        query.apk_version = (!version)?{$exists:true}:version;

        var query = Device.find(query).limit(10);
        query.exec(function (err, Devices) {
            // Execute callback
            callback(null, Devices);
        });

    },
    // Проверка на наличее ID и флага не зарегестрирован в БД
    regDevice: function (id, callback) {
        var device = Device;
        device.findOne({"device_id": id.id, "registered": false}, function (err, device) {
            if (err) throw err;
            callback(null, device);
        });
    },
    //Авторизация планшета
    authDevice: function (deviceInfo, callback) {
        var device = Device;
        device.findOne({"device_id": deviceInfo.id, "token": deviceInfo.token, "registered":true}, function (err, device) {
            if (err) return console.log(err);
            callback(null, device);
        });
    },
    // Находим версию по ИД устройства
    findVersion: function (deviceInfo, callback) {
        var device = Device;
        console.log("deviceInfo", deviceInfo);
        device.findOne({"device_id": deviceInfo.id}, {
            "_id": 1,
            "apk_version": 1
        }, function (err, device) {
            if (err) return console.log(err);
            callback(null, device);
        });
    },
    //Сохраняем дату от девайса
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
                var update = {
                    "timestamp" : new Date(),
                    "token"     : token,
                    "registered": true
                };
                Device.update({"device_id": deviceInfo.id}, {$set: update}, {upsert: true}, function (err, updated) {
                    if (err) {
                        console.log("not updated", err);
                    }
                    if (updated != null ){
                    // Execute callback passed from route
                    callback(null,token)}
                });
            }
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
    //TODO Переписать, сейчас возможны дубликаты при множественной генерации id
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