var deviceMagic = require('../dbMagic/deviceMagic');
//var app = require('../routes.js').app();
module.exports = {
    // ¬ыводим общее количество устройств
    getAllDeviceQuantity: function (callback) {
        deviceMagic.getQuantity(function (err, Quantity) {
            if (err) {
                console.log(err);
            }
            callback(null, Quantity);
        });
    },
    // «апускаем поиск устройств по колличеству(count),
    getDevice: function (callback,count) {
        deviceMagic.getDevice(function (err, Devices) {
            if (err) {
                console.log(err);
            }
            callback(null, Devices);
        },count);
    },

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
    }
};
