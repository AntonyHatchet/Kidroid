var deviceMagic = require('../dbMagic/deviceMagic');
var user = require('../routes/users.js');
var server = require('../../config/server.js').address;
var Cron = require('../dbMagic/cronMagic');

module.exports = {
    // Проверяем когда последний раз устройства делали отстук
    checkStatus: function(){
        deviceMagic.getAllDevice(function(err,data){
            if (err) return console.log(err,"checkStatus deviceMagic.getAllDevice err");

            data.forEach(function(device){
                var time = (new Date - device.timestamp)/60000;
                if (time > 30){
                    deviceMagic.updateDeviceStatus(device._id);
                }
            })
        });
    },
    findAllStatus: function(cb){
            deviceMagic.findAllStatus(function (err, version) {

                if (err) return console.log(err,"findAllVersion userMagic.findAllVersion err");
                var statuses = [];
                version.forEach(function(device){
                    if (statuses.indexOf(device.status) == -1){
                        statuses.push(device.status);
                    }
                });
                cb(null, statuses);
            });
    },
//Регистрация девайса
    getRegistrationDevice: function (req, res) {

        deviceMagic.regDevice({id: req.body.device_id}, function (err, next) {

            if (err) return console.log(err,"getRegistrationDevice deviceMagic.regDevice err");

            if (next === null) {
                res.json({"error": "wrong ID"});
            }

            deviceMagic.registrDevice(req.body.device_id, function (err, token) {

                if (err) return console.log(err,"getRegistrationDevice deviceMagic.registrDevice err");

                if (token != null) {
                    console.log("res token", token);
                    res.json({"token": token});
                }

            });
        });
    },
    getRemoveDevice: function (req, res) {

        deviceMagic.removeDevice({id: req.body.device_id}, function (err, next) {

            if (err) return console.log(err,"getRemoveDevice deviceMagic.removeDevice err");

            if (next === null) {
                res.json({"success": false});
            }
            res.json({"success": true});
        });
    },
//Авторизация планшета по ИД и токену
    getAuthorizationDevice: function (req, res, next) {
        console.log(req.body, "Authorization Data");
        var id = !req.param.id ? req.body.device_id : req.params.id;
        var token = !req.param.token ? req.body.token : req.params.token;
        deviceMagic.authDevice({id: id, token: token}, function (err, callback) {

            if (err) return console.log(err,"getAuthorizationDevice deviceMagic.authDevice err");

            if (callback === null) {
                return res.json({"error": "Wrong ID"});
            }

            return next();

        });
    },
    // сверка необходимости обновления версии АПК
    checkApkVersion: function (req, res, next) {
        console.log(req.body);
        deviceMagic.findVersion({id: req.body.device_id}, function (err, device) {

            if (err) return console.log(err,"checkApkVersion deviceMagic.findVersion err");

            if (device.apkToUpdate.build != req.body.apk_build) {
                user.findLink(device.apkToUpdate.build,function(err,callback){

                    if (err) return console.log(err,"checkApkVersion user.findLink err");

                    res.json({update_required: true, version: device.apkToUpdate.build, link: server + callback[0].link.slice(1)});
                });
            }
            if(device.updateRequired === true){
                Cron.counter(device.task,function(err,callback){
                    if (err) return console.log(err,"checkApkVersion Cron.counter err");
                    if (callback)
                        next();
                })
            }
            else {
              next();
            }

        });
    },
    getApk: function (req, res, next) {
        deviceMagic.findVersion({id: req.params.id}, function (err, device) {

            if (err) return console.log(err,"getApk deviceMagic.findVersion err");

            if (device.update_required === false) {
                next();
            }
            else {
                user.findLink(device.apk_to_update,function(err,callback){

                    if (err) return console.log(err,"getApk user.findLink err");

                    res.json({update_required: true, version: device.apk_to_update, link: server + callback[0].link.slice(1)});
                })
            }

        });
    },
    //Сохранение данных полученных от планшета
    getSaveData: function (req, res) {
        deviceMagic.updateDevice(req.body, function (err) {

            if (err) return console.log(err,"getSaveData deviceMagic.updateDevice err");

            res.json({update_required: false, version: 0, link: null});
        });
    }
};
