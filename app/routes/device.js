var deviceMagic = require('../dbMagic/deviceMagic');
module.exports = {
//����������� �������
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
//����������� �������� �� �� � ������
    getAuthorizationDevice: function (req, res, next) {
        console.log(req.body,"req body");
        var id = !req.param.id ? req.body.device_id:req.params.id;
        var token = !req.param.token ? req.body.token:req.params.token;
        deviceMagic.authDevice({id: id, token: token}, function (err,callback) {

            if (err) {
                console.log(err);
            }
            if (callback === null){
                console.log(callback);
               return res.json({"error":"Wrong ID"});
            }

            return next();

        });
    },
    // ������ ������������� ���������� ������ ���
    checkApkVersion: function (req, res, next) {
        deviceMagic.findVersion({id: req.body.device_id, version: req.body.apk_version}, function (err, device) {

            if (err) {
                console.log(err);
            }
            if (device.apk_version == req.body.apk_version) {
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
    //���������� ������ ���������� �� ��������
    getSaveData: function (req, res) {
        deviceMagic.updateDevice(req.body, function (err) {
            if (err) {
                console.log(err);
            }
            res.json({update_required: false, version: 0, link: null });
        });
    }
};
