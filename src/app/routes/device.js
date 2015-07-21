var deviceMagic = require('../dbMagic/deviceMagic');
var user = require('./users.js');
var server = require('../../config/server.js').address;
var Cron = require('../dbMagic/cronMagic');

module.exports = {
    // Проверяем когда последний раз устройства делали отстук
    checkStatus: function(){
        deviceMagic.getAllDevice(function(err,data){
            if (err) throw new Error(err,"checkStatus deviceMagic.getAllDevice err");

            data.forEach(function(device){
                var time = (new Date() - device.timestamp)/60000;
                if (time > 30){
                    deviceMagic.updateDeviceStatus(device._id);
                }
            })
        });
    },
    findAllStatus: function(cb){
            deviceMagic.findAllStatus(function (err, version) {

                if (err) throw new Error(err,"findAllVersion userMagic.findAllVersion err");
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

        deviceMagic.regDevice({id: req.body.id}, function (err, next) {

            if (err) throw new Error(err,"getRegistrationDevice deviceMagic.regDevice err");

            if (next === null) {
                res.json({"error": "wrong ID"});
            }

            deviceMagic.registrDevice(req.body.id, function (err, token) {

                if (err) throw new Error(err,"getRegistrationDevice deviceMagic.registrDevice err");

                if (token != null) {
                    console.log("res token", token);
                    res.json({"token": token});
                }

            });
        });
    },
    getRemoveDevice: function (req, res) {

        deviceMagic.removeDevice({id: req.body.id}, function (err, next) {

            if (err) throw new Error(err,"getRemoveDevice deviceMagic.removeDevice err");

            if (next === null) {
                res.json({"success": false});
            }
            res.json({"success": true});
        });
    },
//Авторизация планшета по ИД и токену
    getAuthorizationDevice: function (req, res, next) {
        console.log(!req.params.id, "Authorization Data");
        var id = !req.params.id ? req.body.id : req.params.id;
        console.log(id)
        var token = !req.params.token ? req.body.token : req.params.token;
        deviceMagic.authDevice({id: id, token: token}, function (err, callback) {

            if (err) throw new Error(err,"getAuthorizationDevice deviceMagic.authDevice err");

            if (callback === null) {
                return res.json({"error": "Wrong ID"});
            }

            return next();

        });
    },
    // сверка необходимости обновления версии АПК
    checkApkVersion: function (req, res, next) {
        if (!req.body.id||!req.body.token||!req.body.apk_build||!req.body.loader_version){
            return res.json([{type:"Error",Message:"Wrong data"}]);
        }else
        deviceMagic.findVersion({id: req.body.id}, function (err, device) {
            console.log(device, "checkApkVersion device from DB");
            if (err) throw new Error(err,"checkApkVersion deviceMagic.findVersion err");

            if (device.apkToUpdate.build != req.body.apk_build && device.kidroidToUpdate != req.body.loader_version) {
                console.log(device, "Super update");
                user.findLink(device.apkToUpdate.build,"Marionette",function(err,apk){
                    if (err) throw new Error(err,"checkApkVersion user.findLink err");

                    user.findLink(device.kidroidToUpdate,"Kidroid",function(err,kidroid){

                        if (err) throw new Error(err,"checkApkVersion user.findLink err");
                        return res.json([{type:"kidroid",update_required: true, version: device.kidroidToUpdate, link: server + kidroid[0].link.slice(1)},{type:"marionette",update_required: true, version: device.apkToUpdate.build, link: server + apk[0].link.slice(1)}]);
                    });
                });
            }else
            if (device.apkToUpdate.build != req.body.apk_build) {
                user.findLink(device.apkToUpdate.build,"Marionette",function(err,callback){

                    if (err) throw new Error(err,"checkApkVersion user.findLink err");
                    console.log(callback,"Apk")
                    return res.json([{type:"marionette",update_required: true, version: device.apkToUpdate.build, link: server + callback[0].link.slice(1)}]);
                });
            }else
            if (device.kidroidToUpdate != req.body.loader_version) {
                console.log("started Kidroid update")
                user.findLink(device.kidroidToUpdate,"Kidroid",function(err,callback){

                    if (err) throw new Error(err,"checkApkVersion user.findLink err");
                    console.log(callback,"Kidroid")
                    return res.json([{type:"kidroid",update_required: true, version: device.kidroidToUpdate, link: server + callback[0].link.slice(1)}]);
                });
                console.log("Kidroid update after response ")
            }else
            if(device.updateRequired === true){
                Cron.counter(device.task,function(err,callback){
                    if (err) throw new Error(err,"checkApkVersion Cron.counter err");
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

            if (err) throw new Error(err,"getApk deviceMagic.findVersion err");

            if (device.update_required === false) {
                next();
            }
            else {
                user.findLink(device.apk_to_update,function(err,callback){

                    if (err) throw new Error(err,"getApk user.findLink err");

                    res.json({update_required: true, version: device.apk_to_update, link: server + callback[0].link.slice(1)});
                })
            }

        });
    },
    getApkFirewall: function (req, res) {
        deviceMagic.findFirewallRules(function (err, rules) {
            if (err) throw new Error(err,"getApk deviceMagic.findVersion err");
            switch(rules[0].access){
                case "white":
                    console.log("true",rules[0].access);
                    res.json({whiteList: rules[0].whiteList, blackList:[]});
                    break;
                case "black":
                    console.log("false",rules[0].access);
                    res.json({whiteList: [], blackList:rules[0].blackList});
                    break;
                case "all":
                    console.log("null",rules[0].access);
                    res.json({whiteList: [], blackList:[]});
                    break;
                default:
                    throw new Error("FirewallList undefined case");
            }
        });
    },
    //Сохранение данных полученных от планшета
    getSaveData: function (req, res) {
        deviceMagic.updateDevice(req.body, function (err) {

            if (err) throw new Error(err,"getSaveData deviceMagic.updateDevice err");

            res.json({update_required: false, version: 0, link: null});
        });
    }
};
