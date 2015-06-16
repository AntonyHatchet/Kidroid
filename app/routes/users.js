'use strict';
var deviceMagic = require('../dbMagic/deviceMagic');
var userMagic = require('../dbMagic/userMagic');
var Busboy = require('busboy');
var fs = require('fs-extra');
var crypto = require('crypto');
var unzip = require('unzip');
var ApkReader = require('node-apk-parser');
var util = require('util');


// TODO при рефакторинге перепесиать повторяющиеся функции создания и удаления на одну функцию с указанием типа данных.
module.exports = {
    //ПОЛЬЗОВАТЕЛИ
    //Поиск всех пользователей
    findUser: function (id,callback) {
        userMagic.findById(id, function (err, user) {
            callback(err, user);
        });
    },
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
    createVersionAPK: function (req, res) {

            function createBufer() {
                var path =  "./public/uploads/buffer/"+ Math.floor(Math.random() * (1000 - 1)) + 1+"/";
                this.getPath = function(){
                    return path
                };
            };

            var bufer = new createBufer().getPath();
            var busboy = new Busboy({ headers: req.headers });

            busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
                var unzipParsrer = file.pipe(unzip.Parse());
                unzipParsrer.on('entry', function (entry) {
                    var fileType = entry.path.slice(-3);
                    var type = entry.type; // 'Directory' or 'File'
                    var size = entry.size;
                    if (fileType === "apk"||fileType === "md5"||fileType === "txt" ) {
                        entry.pipe(fs.createOutputStream(bufer+ entry.path));
                        console.log('File [' + entry.path + '] Finished');
                    } else {
                        entry.autodrain();
                    }
                });
                unzipParsrer.on('close', function(){
                    var zip = {
                        findCheckSum: function(path){
                            var shasum = crypto.createHash('md5');
                            var s = fs.createReadStream(path + "mytextbooks-school-release.apk");
                            s.on('data', function(d) { shasum.update(d); });
                            s.on('end', function() {
                                var d = shasum.digest('hex');
                                return d
                            });
                        },
                        readCheckSum : function(path){
                            fs.readFileSync(path+"list.md5", 'utf8').slice(17);
                        },
                        checkSum:function(path){
                            return (this.findCheckSum(path)===this.readCheckSum(path))
                        },
                        checkVersion:function(path){
                            var reader = ApkReader.readFile(path + "mytextbooks-school-release.apk");
                            var manifest = reader.readManifestSync();
                            manifest.inspect = function() {
                                Object.defineProperty(this,{
                                    versionCode: function() {
                                        return this.versionCode;
                                    },
                                    versionName: function() {
                                        return this.versionName;
                                    }
                                });
                            };
                            return {version:manifest.versionName.slice(0,3), build:manifest.versionCode}
                        }
                    };

                    if(zip.checkSum(bufer)){
                        if (zip.checkVersion(bufer)){
                            var apk = new zip.checkVersion(bufer);
                            apk.link = './public/uploads/Marionette-APK/'+apk.build + ".zip";
                            apk.user = req.user.local.name;
                            fs.exists('./public/uploads/Marionette-APK/'+apk.build + ".zip", function (exists) {
                                if(!exists){
                                    fs.move(bufer+"/zip/"+filename, apk.link, function (err) {
                                        if (err) return console.error(err,"fs.move");
                                        console.log("success move!")
                                    });
                                    userMagic.createVersionApk(apk, function(err,cb){
                                        if (err) return console.error(err,"users.createVersion APK");
                                        console.log(cb,"createVersion APK callback");
                                        fs.remove(bufer, function (err) {
                                            if (err) return console.error(err);

                                            console.log('success remove!')
                                        })
                                    })
                                }
                                res.end();
                            });

                        }
                    }
                });
                file.pipe(fs.createOutputStream(bufer+"/zip/"+filename));
            });
            busboy.on('finish', function() {
                console.log('Done parsing form!');
                res.writeHead(303, { Connection: 'close', Location: '/dashboard' });
                res.end();
            });
            req.pipe(busboy);
    },
    createVersionKidroid: function (req, res) {

            function createBufer() {
                var path =  "./public/uploads/buffer/"+ Math.floor(Math.random() * (1000 - 1)) + 1+"/";
                this.getPath = function(){
                    return path
                };
            };

            var bufer = new createBufer().getPath();
            var busboy = new Busboy({ headers: req.headers });
            var arrApk = [];
            var arrApk2 = [];

            busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
                var unzipParsrer = file.pipe(unzip.Parse());
                unzipParsrer.on('entry', function (entry) {
                    var fileType = entry.path.slice(-3);
                    var type = entry.type; // 'Directory' or 'File'
                    var size = entry.size;
                    if (fileType === "apk"||fileType === "md5"||fileType === "txt" ) {
                        entry.pipe(fs.createOutputStream(bufer+ entry.path));
                        if (fileType === "apk"){
                            arrApk.push(entry.path)
                        }
                    } else {
                        entry.autodrain();
                    }
                });
                unzipParsrer.on('close', function(){

                console.log("Unzip");
                console.log(arrApk,"arrApk first");
                    var zip = {
                        findCheckSum: function(path){
                            var shasum = crypto.createHash('md5');
                            console.log(path,"path");
                            var s = fs.createReadStream(path);
                            s.on('data', function (d) {
                                shasum.update(d);
                            });
                            s.on('end', function () {
                                var d = shasum.digest('hex');
                                console.log(d,"d");
                                arrApk2.push(d);
                                console.log(arrApk2,"arrApk2");
                                return d
                            });
                        },
                        readCheckSum : function(path){
                            fs.readFileSync(path+"list.md5", 'utf8').slice(17);
                        },
                        checkSum:function(path){
                            return (this.findCheckSum(path)===this.readCheckSum(path))
                        },
                        checkVersion:function(path){
                            var reader = ApkReader.readFile(path + "mytextbooks-school-release.apk");
                            var manifest = reader.readManifestSync();
                            manifest.inspect = function() {
                                Object.defineProperty(this,{
                                    versionCode: function() {
                                        return this.versionCode;
                                    },
                                    versionName: function() {
                                        return this.versionName;
                                    }
                                });
                            };
                            return {version:manifest.versionName.slice(0,3), build:manifest.versionCode}
                        }
                    };
                    for(var i=0;i<arrApk.length;i++){
                        zip.findCheckSum(bufer+arrApk[i])
                    }
                    console.log(arrApk2);
                    //
                    //if(zip.checkSum(bufer)){
                    //    if (zip.checkVersion(bufer)){
                    //        var apk = new zip.checkVersion(bufer);
                    //        apk.link = './public/uploads/Marionette-APK/'+apk.build + ".zip";
                    //        apk.user = req.user.local.name;
                    //        fs.exists('./public/uploads/Marionette-APK/'+apk.build + ".zip", function (exists) {
                    //            if(!exists){
                    //                fs.move(bufer+"/zip/"+filename, apk.link, function (err) {
                    //                    if (err) return console.error(err,"fs.move");
                    //                    console.log("success move!")
                    //                });
                    //                userMagic.createVersionApk(apk, function(err,cb){
                    //                    if (err) return console.error(err,"users.createVersion APK");
                    //                    console.log(cb,"createVersion APK callback");
                    //                    fs.remove(bufer, function (err) {
                    //                        if (err) return console.error(err);
                    //
                    //                        console.log('success remove!')
                    //                    })
                    //                })
                    //            }
                    //            res.end();
                    //        });
                    //
                    //    }
                    //}
                });
                file.pipe(fs.createOutputStream(bufer+"/zip/"+filename));
            });
            busboy.on('finish', function() {
                console.log('Done parsing form!');
                res.writeHead(303, { Connection: 'close', Location: '/dashboard' });
                res.end();
            });
            req.pipe(busboy);
    },
    removeMarionetteAPK: function (category, callback) {
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
    getDeviceIdByParams: function (callback,params) {
        deviceMagic.getDeviceId(function (err, Devices) {

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
                            _id: id,
                            school: params.category,
                            version: params.version,
                            build: params.build,
                            filter2: params.filter2
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
    updateUserInfo: function (params, callback) {
       userMagic.updateUserInfo(params, function (err, devices) {

           if (err) return console.log(err,"updateDevice userMagic.updateDeviceInfo err");

            callback(null, devices);
        });
    },
    findFilter: function (callback) {
        userMagic.findAllFilter(function (err, data) {

            if (err) return console.log(err,"createCategory  userMagic.createSchoolCategory err");

            callback(null, data);
        });
    },
    //КАТЕГОРИИ
    //Добавление категорий
    createFilter: function (params, callback) {
        userMagic.createNewFilter(params, function (err, filters) {

            if (err) return console.log(err,"createCategory  userMagic.createSchoolCategory err");

            callback(null, filters);
        });
    },
    //Обновление категорий
    updateFilter: function (params, callback) {
        userMagic.updateFilterParams(params, function (err, category) {

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
    }
};
