var deviceMagic = require('../dbMagic/deviceMagic');
var userMagic = require('../dbMagic/userMagic');

module.exports = {
    // ������� ����� ���������� ���������
    getAllDeviceQuantity: function (callback) {
        deviceMagic.getQuantity(function (err, Quantity) {
            if (err) {
                console.log(err);
            }
            callback(null, Quantity);
        });
    },
    // ��������� ����� ��������� c �����������
    getDevice: function (callback) {
        deviceMagic.getDevice(function (err, Devices) {
            if (err) {
                console.log(err);
            }
            callback(null, Devices);
        });
    },
    //������� ������� � �� �� ���������� ���������
    createCategory: function (category, callback) {
        userMagic.createSchoolCategory(category, function (err, category) {
            if (err) {
                console.log(err);
            }
            callback(null, category);
        });
    },
    removeCategory: function (category, callback) {
        userMagic.removeSchoolCategory(category, function (err, category) {
            if (err) {
                console.log(err);
            }
            callback(null, category);
        });
    },
    findCategory: function (callback) {
        userMagic.findAllCategory(function (err, category) {
            if (err) {
                console.log(err);
            }
            callback(null, category);
        });
    },
    //������� ������� � �� �� ���������� ���������
    createDevice: function (req, res) {
        uploader(0);
        function uploader(i) {
            if (i < req.body.number) {
                deviceMagic.createDeviceId(function (err, id) {
                        if (err) {
                            console.log(err, "id get errr")
                        }
                        deviceMagic.saveDevice({
                                timestamp: new Date(),
                                deviceID: id,
                                school: req.body.school,
                                apk: req.body.apk,
                                registered: false
                            },
                            function (err) {
                                if (err) {
                                    console.log(err);
                                }
                                uploader(i + 1);
                            })
                    }
                )
            }
        }
        setTimeout(function(){res.redirect("/dashboard")}, 2000);
    },
    //������� ������� � �� �� ���������� ������������
    createUser: function (userData, callback) {
                    userMagic.saveUser({
                                name:cb,
                                password:userData.password
                            },
                            function (err) {
                                if (err) {
                                    console.log(err);
                                }
                                callback(null,true)
                            })
    }
};
