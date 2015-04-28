var deviceMagic = require('../dbMagic/deviceMagic');
module.exports = {
//Регистрация девайса
    getRegistrationDevice: function (req, res) {
        deviceMagic.regDevice({id: req.params.id}, function (err,next) {
            if (err) {
                console.log("not correct ID",err);
            }
            if (next === null){
                res.json({"error":"wrong ID"});}
            else
            deviceMagic.registrDevice(req.params, function (err,token) {
                if (err) {
                    console.log("registr err",err);
                }else
                if (token != null) {
                    console.log("res token", token);
                    res.json({"token": token});
                }
            });
        });
    },
//Авторизация планшета по ИД и токену
    getAuthorizationDevice: function (req, res, next) {
        deviceMagic.authDevice({id: req.params.id, token: req.params.token}, function (err,callback) {
            if (err) {
                console.log(err);
            }
            if (callback === null){
               return res.json({"error":"Wrong ID"});
            }
            return next();
        });
    },
    // сверка необходимости обновления версии АПК
    checkApkVersion: function (req, res, next) {
        deviceMagic.findVersion({id: req.params.id, version: req.params.apk_version}, function (err, device) {
            if (err) {
                console.log(err);
            }
            if (device.apk_version === req.params.apk_version) {
                console.log("Same version - ", device.apk_version);
                next();
            }
            else {
                console.log("Different version");
                res.json({"apk_version": device.apk_version});
            }
        });
    },
    getApk: function (req, res, next) {
        deviceMagic.findVersion({id: req.params.id, version: req.params.apk_version}, function (err, device) {
            if (err) {
                console.log(err);
            }
            if (device.apk_version === req.params.apk_version) {
                console.log("Same version - ", device.apk_version);
                next();
            }
            else {
                console.log("Different version");
                res.json({"UPDATE_AVAILABLE": 1});
            }
        });
    },
    //Сохранение данных полученных от планшета
    getSaveData: function (req, res) {
        console.log("save device info");
        deviceMagic.updateDevice(req.params, function (err) {
            if (err) {
                console.log(err);
            }
            res.end();
        });
    }
};
