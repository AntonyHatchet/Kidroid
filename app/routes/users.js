var deviceMagic = require('../dbMagic/deviceMagic');
var userMagic = require('../dbMagic/userMagic');


// TODO при рефакторинге перепесиать повторяющиеся функции создания и удаления на одну функцию с указанием типа данных.
module.exports = {
    // ВЕРСИИ
    createVersion: function (category, callback) {
        userMagic.createVersion(category, function (err, category) {
            if (err) {
                console.log(err);
            }
            callback(null, category);
        });
    },
    removeVersion: function (category, callback) {
        userMagic.removeVersion(category, function (err, category) {
            if (err) {
                console.log(err);
            }
            callback(null, category);
        });
    },
    //Поиск всех версий
    findAllVersion: function (callback) {
        userMagic.findAllVersion(function (err, version) {
            if (err) {
                console.log(err);
            }
            callback(null, version);
        });
    },
    // УСТРОЙСТВА
    // Выводим общее количество устройств
    getAllDeviceQuantity: function (callback) {
        deviceMagic.getQuantity(function (err, Quantity) {
            if (err) {
                console.log(err);
            }
            callback(null, Quantity);
        });
    },
    // Запускаем поиск устройств c параметрами
    getDevice: function (callback,params) {
        deviceMagic.getDevice(function (err, Devices) {
            if (err) {
                console.log(err);
            }
            callback(null, Devices);
        },params);
    },
    //Создаем запросы к БД на добавление устройств
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

        setTimeout(function () {
            res.redirect("/dashboard")
        }, 2000);
    },

    //КАТЕГОРИИ
    //Добавление категорий
    createCategory: function (category, callback) {
        userMagic.createSchoolCategory(category, function (err, category) {
            if (err) {
                console.log(err);
            }
            callback(null, category);
        });
    },
    //Обновление категорий
    updateCategory: function (params, callback) {
        userMagic.updateSchoolCategory(params, function (err, category) {
            if (err) {
                console.log(err);
            }
            callback(null, category);
        });
    },
    //Удаление категорий
    removeCategory: function (category, callback) {
        userMagic.removeSchoolCategory(category, function (err, category) {
            if (err) {
                console.log(err);
            }
            callback(null, category);
        });
    },
    //Поиск всех категорий
    findCategory: function (callback) {
        userMagic.findAllCategory(function (err, category) {
            if (err) {
                console.log(err);
            }
            callback(null, category);
        });
    }
};
