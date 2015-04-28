var deviceMagic = require('../dbMagic/deviceMagic');
module.exports = {
//����������� �������� �� �� � ������
    getAuthorizationDevice: function (req, res, next) {
        deviceMagic.authDevice({id: req.params.id, token: req.params.token}, function (err) {
            if (err) {
                console.log(err);
            }
            return next();
        });
    },
    // ������ ������������� ���������� ������ ���
    checkApkVersion: function (req, res, next) {
        deviceMagic.findVersion({id: req.params.id, version: req.params.apk_version}, function (err, device) {
            if (err) {
                console.log(err);
            }
            if (device.device.apk_version === req.params.apk_version) {
                console.log("Same version - ", device.device.apk_version);
                next();
            }
            else {
                console.log("Different version");
                res.json({"UPDATE_AVAILABLE": 1});
            }
        });
    },
    getApk: function (req, res, next) {
        deviceMagic.findVersion({id: req.params.id, version: req.params.apk_version}, function (err, device) {
            if (err) {
                console.log(err);
            }
            if (device.device.apk_version === req.params.apk_version) {
                console.log("Same version - ", device.device.apk_version);
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
        console.log("save device info");
        deviceMagic.updateDevice(req.params, function (err) {
            if (err) {
                console.log(err);
            }
            res.end();
        });
    }
};
