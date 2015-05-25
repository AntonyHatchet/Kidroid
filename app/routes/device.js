var deviceMagic = require('../dbMagic/deviceMagic');
module.exports = {
//Регистрация девайса
    getRegistrationDevice: function (req, res) {

        deviceMagic.regDevice({id: req.body.id}, function (err,next) {

            if (err) {
                console.log("not correct ID",err);
            }
            if (next === null){
                res.json({"error":"wrong ID"});}

            deviceMagic.registrDevice(req.body, function (err,token) {

                if (err) {
                    console.log("registr err",err);
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
        console.log(req.body,"token");
        var id = !req.param? req.body.device_id:req.params.id;
        var token = !req.param? req.body.token:req.params.token;
        console.log(id,"id",token,"token");
        deviceMagic.authDevice({id: id, token: token}, function (err,callback) {

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
        deviceMagic.findVersion({id: req.body.id, version: req.body.apk_version}, function (err, device) {

            if (err) {
                console.log(err);
            }
            if (device.apk_version === req.body.apk_version) {
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
        deviceMagic.updateDevice(req.body, function (err) {
            if (err) {
                console.log(err);
            }
            res.end();
        });
    }
};
