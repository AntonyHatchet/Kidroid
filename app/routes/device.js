var deviceMagic = require('../dbMagic/deviceMagic');
var user = require('../routes/users.js');
var server = require('../../config/server.js').address;
module.exports = {
//Регистрация девайса
    getRegistrationDevice: function (req, res) {

        deviceMagic.regDevice({id: req.body.id}, function (err, next) {

            if (err) {
                console.log("not correct ID", err);
            }
            if (next === null) {
                res.json({"error": "wrong ID"});
            }

            deviceMagic.registrDevice(req.body, function (err, token) {

                if (err) {
                    console.log("registr err", err);
                }
                if (token != null) {
                    console.log("res token", token);
                    res.json({"token": token});
                }

            });
        });
    },
//Авторизация планшета по ИД и токену
    getAuthorizationDevice: function (req, res, next) {
        console.log(req.body, "Authorization Data");
        var id = !req.param.id ? req.body.device_id : req.params.id;
        var token = !req.param.token ? req.body.token : req.params.token;
        deviceMagic.authDevice({id: id, token: token}, function (err, callback) {

            if (err) {
                console.log(err);
            }
            if (callback === null) {
                return res.json({"error": "Wrong ID"});
            }

            return next();

        });
    },
    // сверка необходимости обновления версии АПК
    checkApkVersion: function (req, res, next) {
        deviceMagic.findVersion({id: req.body.device_id}, function (err, device) {
            console.log(req.body.device_id,"that device check version");
            console.log(device,"callback from DB");
            if (err) {
                console.log(err);
            }
            if (device.update_required === false) {
                console.log("Same version - ", device.apk_version);
                next();
            }
            else {
                user.findLink(device.apk_to_update,function(err,callback){
                    console.log("Different version", callback);
                    if (err) {
                        console.log(err);
                    }
                    console.log("response to device", callback[0].link);
                    res.json({update_required: true, version: device.apk_to_update, link: server + callback.link});
                })
            }

        });
    },
    getApk: function (req, res, next) {
        deviceMagic.findVersion({id: req.params.id}, function (err, device) {

            if (err) {
                console.log(err);
            }
            if (device.update_required === false) {
                console.log("Same version - ", device.apk_to_update);
                next();
            }
            else {
                user.findLink(device.apk_to_update,function(callback){
                    if (err) {
                        console.log(err);
                    }
                    res.json({update_required: true, version: device.apk_to_update, link: callback});
                })
            }

        });
    },
    //Сохранение данных полученных от планшета
    getSaveData: function (req, res) {
        deviceMagic.updateDevice(req.body, function (err) {
            if (err) {
                console.log(err);
            }
            res.json({update_required: false, version: 0, link: null});
        });
    }
};
