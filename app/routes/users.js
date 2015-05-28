var deviceMagic = require('../dbMagic/deviceMagic');
var userMagic = require('../dbMagic/userMagic');


// TODO при рефакторинге перепесиать повторяющиеся функции создания и удаления на одну функцию с указанием типа данных.
module.exports = {
    //ПОЛЬЗОВАТЕЛИ
    //Поиск всех пользователей
    findAllUsers: function (callback) {
        userMagic.findAllUsers(function (err, data) {
            if (err) {
                console.log(err);
            }
            callback(null, data);
        });
    },
    removeUsers: function (id, callback) {
        userMagic.removeUsers(id, function (err, data) {
            if (err) {
                console.log(err);
            }
            callback(null, data);
        });
    },
    // ВЕРСИИ
    createVersion: function (version, callback) {
        userMagic.createVersion(version, function (err, version) {
            if (err) {
                console.log(err);
            }
            callback(null, version);
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
    findLink: function (version,callback) {
        userMagic.findLink(version,function (err, link) {
            if (err) {
                console.log(err);
            }
            callback(null, link);
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
    //Удаляем девайс
    removeDevice: function (id, callback) {
        deviceMagic.removeDevice(id, function (err, data) {
            if (err) {
                console.log(err);
            }
            callback(null, data);
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
    createDevice: function (params, callback) {
        uploader(0);
        function uploader(i) {
            if (i < params.numberDevice) {
                deviceMagic.createDeviceId(function (err, id) {
                        if (err) {
                            console.log(err, "id get errr")
                        }
                        deviceMagic.saveDevice({
                                timestamp: new Date(),
                                deviceID: id,
                                school: params.category,
                                update: params.version,
                                registered: false
                            },
                            function (err) {
                                if (err) {
                                    console.log(err);
                                }
                                deviceMagic.getDevice(function(err,data){
                                    if (err) {
                                        console.log(err);
                                    }
                                    callback(null,data)
                                });
                                uploader(i + 1);
                            })
                    }
                )
            }
        }
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
