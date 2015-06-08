'use strict';
var deviceMagic = require('../dbMagic/deviceMagic');
var userMagic = require('../dbMagic/userMagic');


// TODO при рефакторинге перепесиать повторяющиеся функции создания и удаления на одну функцию с указанием типа данных.
module.exports = {
    //ПОЛЬЗОВАТЕЛИ
    //Поиск всех пользователей
    findAllUsers: function (callback) {
        userMagic.findAllUsers(function (err, data) {

            if (err) return console.log(err,"findAllUsers userMagic.findAllUsers err");

            callback(null, data);
        });
    },
    removeUsers: function (id, callback) {
        userMagic.removeUsers(id, function (err, data) {

            if (err) return console.log(err,"removeUsers userMagic.removeUsers err");

            callback(null, data);
        });
    },
    // ВЕРСИИ
    createVersion: function (version, callback) {
        userMagic.createVersion(version, function (err, version) {

            if (err) return console.log(err,"createVersion userMagic.createVersion err");

            callback(null, version);
        });
    },
    removeVersion: function (category, callback) {
        userMagic.removeVersion(category, function (err, category) {

            if (err) return console.log(err,"removeVersion userMagic.removeVersion err");

            callback(null, category);
        });
    },
    //Поиск всех версий
    findAllVersion: function (callback) {
        userMagic.findAllVersion(function (err, version) {

            if (err) return console.log(err,"findAllVersion userMagic.findAllVersion err");

            callback(null, version);
        });
    },
    makeDefaultVersion: function(location,id,callback){
        userMagic.makeDefault(location,id,function (err, version) {

            if (err) return console.log(err,"makeDefaultVersion userMagic.makeDefault err");

            module.exports.getDefaultVersion(function(err,versions){
                callback(null, versions);
            })
        });
    },
    getDefaultVersion: function(callback){

    },
    findLink: function (version,callback) {
        userMagic.findLink(version,function (err, link) {

            if (err) return console.log(err,"findLink userMagic.findLink err");

            callback(null, link);
        });
    },
    // УСТРОЙСТВА
    // Выводим общее количество устройств
    getAllDeviceQuantity: function (callback,params) {
        deviceMagic.getQuantity(function (err, Quantity) {

            if (err) return console.log(err,"getAllDeviceQuantity deviceMagic.getQuantity err");

            callback(null, Quantity);
        },params);
    },
    //Удаляем девайс
    removeDevice: function (id, callback) {
        deviceMagic.removeDevice(id, function (err, data) {

            if (err) return console.log(err,"removeDevice deviceMagic.removeDevice err");

            callback(null, data);
        });
    },
    // Запускаем поиск устройств c параметрами
    getDevice: function (callback,params) {
        deviceMagic.getDevice(function (err, Devices) {

            if (err) return console.log(err,"getDevice deviceMagic.getDevice err");

            callback(null, Devices);
        },params);
    },
    //Создаем запросы к БД на добавление устройств
    createDevice: function (params, callback,end) {
        uploader(0);
        function uploader(i) {
            if (i < params.numberDevice) {
                deviceMagic.createDeviceId(function(err,id){

                    if (err) return console.log(err,"createDevice deviceMagic.createDeviceId err");

                    deviceMagic.saveDevice({
                            deviceID: id,
                            school: params.category,
                            version: params.version,
                            build: params.build
                        },
                        function (err,savedDevice) {

                            if (err) return console.log(err,"createDevice deviceMagic.saveDevice err");

                            deviceMagic.getDevice(function(err,data){

                                if (err) return console.log(err,"createDevice deviceMagic.getDevice err");

                                callback(null,data,savedDevice);
                                if (i == params.numberDevice){
                                    console.log("Use end callback");
                                    end(null,true);
                                }
                            });
                            uploader(++i);
                        });
                });
            }
        }
    },
    updateDevice: function (params, callback) {
       userMagic.updateDeviceInfo(params, function (err, devices) {

           if (err) return console.log(err,"updateDevice userMagic.updateDeviceInfo err");

            callback(null, devices);
        });
    },
    //КАТЕГОРИИ
    //Добавление категорий
    createCategory: function (category, callback) {
        userMagic.createSchoolCategory(category, function (err, category) {

            if (err) return console.log(err,"createCategory  userMagic.createSchoolCategory err");

            callback(null, category);
        });
    },
    //Обновление категорий
    updateCategory: function (params, callback) {
        userMagic.updateSchoolCategory(params, function (err, category) {

            if (err) return console.log(err,"updateCategory  userMagic.updateSchoolCategory err");

            callback(null, category);
        });
    },
    //Удаление категорий
    removeCategory: function (category, callback) {
        userMagic.removeSchoolCategory(category, function (err, category) {

            if (err) return console.log(err,"removeCategory  userMagic.removeSchoolCategory err");

            callback(null, category);
        });
    },
    //Поиск всех категорий
    findCategory: function (callback) {
        userMagic.findAllCategory(function (err, category) {

            if (err) return console.log(err,"findCategory  userMagic.findAllCategory err");

            callback(null, category);
        });
    }
};
