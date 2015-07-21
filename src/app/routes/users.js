'use strict';
var deviceMagic = require('../dbMagic/deviceMagic');
var userMagic = require('../dbMagic/userMagic');
var Busboy = require('busboy');
var fs = require('fs-extra');
var crypto = require('crypto');
var unzip = require('unzip');
var ApkReader = require('node-apk-parser');
var util = require('util');


// TODO ��� ������������ ����������� ������������� ������� �������� � �������� �� ���� ������� � ��������� ���� ������.
module.exports = {
    //������������
    //����� ���� �������������
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
    // ������
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
                            console.log("findCheckSum");
                            var shasum = crypto.createHash('md5');
                            try {
                                var s = fs.createReadStream(path + "mytextbooks-school-release.apk");
                            } catch (err) {
                                if (err) {
                                  console.log("error occured");
                                }
                            }
                            s.on('data', function(d) { shasum.update(d); });
                            s.on('end', function() {
                                var d = shasum.digest('hex');
                                return d
                            });
                        },
                        readCheckSum : function(path){
                            console.log("readCheckSum");
                            fs.readFileSync(path+"list.md5", 'utf8').slice(17);
                        },
                        checkSum:function(path){
                            console.log("checkSum");
                            return (this.findCheckSum(path)===this.readCheckSum(path))
                        },
                        checkVersion:function(path){
                            console.log("checkVersion");
                            try {
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
                            } catch (err) {
                                if (err) {
                                    console.log("error occured");
                                    res.end()
                                }
                            }
                        }
                    };
                    setTimeout(start,1000);
                    function start(){
                        if(zip.checkSum(bufer)){
                            if (zip.checkVersion(bufer)){
                                var apk = new zip.checkVersion(bufer);
                                console.log("checkVersion apk", apk)
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
            console.log("readCheckSum");
            function createBufer() {
                var path =  "./public/uploads/buffer/"+ Math.floor(Math.random() * (1000 - 1)) + 1+"/";
                this.getPath = function(){
                    return path
                };
            };

            var bufer = new createBufer().getPath();
            var busboy = new Busboy({ headers: req.headers });
            var arrApk = [];

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
                    var zip = {
                        CheckSum: function(path,callback){
                            var checkNumber=[];
                            console.log('CheckSum');
                            var sumArr = fs.readFileSync(path+"list.md5", 'utf8').split("\r\n");
                            for(var i=0;i< sumArr.length;i++){
                                sumArr[i]= sumArr[i].slice(sumArr[i].indexOf(':')+1)
                            }
                            function check(cb,apk,files){
                                var shasum = crypto.createHash('md5');
                                var s = fs.createReadStream(path+apk);
                                s.on('data', function (d) {
                                    shasum.update(d);
                                });
                                s.on('end', function () {
                                    var d = shasum.digest('hex');
                                    console.log("d",(d==files))
                                    cb(null,(d==files))
                                });

                            }

                            for (var j=0;j<sumArr.length;j++) {
                                for (var f = 0; f < arrApk.length; f++) {
                                    check(function(err,data){
                                       if(err)throw new err;
                                        if(data){
                                            checkNumber.push(data);
                                           if(checkNumber.length===sumArr.length){
                                                return callback(null,true);
                                            }
                                        }
                                    },arrApk[f],sumArr[j]);
                                }
                            }

                        },
                        checkVersion:function(path){
                            var reader = fs.readFileSync(path+"version.txt", 'utf8');
                            return {loader:reader}
                        }
                    };
                    //
                    setTimeout(startKidroid,1000);
                    function startKidroid(){
                        zip.CheckSum(bufer,function(err,callback){
                            if (err)throw err;
                            if (callback){
                                console.log('CheckSum callback');
                                if (zip.checkVersion(bufer)){
                                    var kidroid = new zip.checkVersion(bufer);
                                    kidroid.link = './public/uploads/Kidroid-APK/'+kidroid.loader + ".zip";
                                    kidroid.user = req.user.local.name;
                                    fs.exists('./public/uploads/Kidroid-APK/'+kidroid.loader + ".zip", function (exists) {
                                        if(!exists){
                                            console.log(exists,"exists");
                                            fs.move(bufer+"/zip/"+filename, kidroid.link, function (err) {
                                                if (err) return console.error(err,"fs.move");
                                                console.log("success move!")
                                            });
                                            userMagic.createVersionKidroid(kidroid, function(err,cb){
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
    removeMarionetteAPK: function (category, callback) {
        userMagic.removeApkVersion(category, function (err, category) {

            if (err) return console.log(err,"removeVersion userMagic.removeVersion err");

            callback(null, category);
        });
    },
    removeKidroid: function (category, callback) {
        userMagic.removeKidroidVersion(category, function (err, category) {

            if (err) return console.log(err,"removeVersion userMagic.removeVersion err");

            callback(null, category);
        });
    },
    //����� ���� ������
    findAllVersion: function (callback) {
        userMagic.findAllVersion(function (err, version) {

            if (err) return console.log(err,"findAllVersion userMagic.findAllVersion err");

            callback(null, version);
        });
    },
    makeDefaultVersion: function(params,callback){
        userMagic.makeDefault(params,function (err, data) {

            if (err) return console.log(err,"makeDefaultVersion userMagic.makeDefault err");

            if(data != null){
                userMagic.findAllVersion(function(err,versions){
                    if (err) return console.log(err,"makeDefaultVersion findAllVersion err");
                    callback(null, versions);
                })

            }
        });
    },
    findLink: function (version,type,callback) {
        console.log(version,type,"some data")
        if (type === "Kidroid"){
            userMagic.findLinkKidroid(version,function (err, link) {

                if (err) return console.log(err,"findLink userMagic.findLink err");

                callback(null, link);
            });
        }else if (type === "Marionette"){
            userMagic.findLinkApk(version,function (err, link) {

                if (err) return console.log(err,"findLink userMagic.findLink err");

                callback(null, link);
            });
        }
    },
    // ����������
    // ������� ����� ���������� ���������
    getAllDeviceQuantity: function (callback,params) {
        deviceMagic.getQuantity(function (err, Quantity) {

            if (err) return console.log(err,"getAllDeviceQuantity deviceMagic.getQuantity err");

            callback(null, Quantity);
        },params);
    },
    //������� ������
    removeDevice: function (id, callback) {
        deviceMagic.removeDevice(id, function (err, data) {

            if (err) return console.log(err,"removeDevice deviceMagic.removeDevice err");

            callback(null, data);
        });
    },
    // ��������� ����� ��������� c �����������
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
    //������� ������� � �� �� ���������� ���������
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
                            filter2: params.filter
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
    findFilter: function (callback,data) {
        console.log(data,"filtersssssss")
        if(!data) {
            userMagic.findAllFilter(function (err, data) {

                if (err) return console.log(err, "createCategory  userMagic.createSchoolCategory err");

                callback(null, data);
            });
        }else
        if (data){
            userMagic.findFilterByQuery(function (err, data) {

                if (err) return console.log(err, "createCategory  userMagic.createSchoolCategory err");

                callback(null, data);
            },data);
        }else throw new error;
    },
    //���������
    //���������� ���������
    createFilter: function (params, callback) {
        userMagic.createNewFilter(params, function (err, filters) {

            if (err) return console.log(err,"createCategory  userMagic.createSchoolCategory err");

            callback(null, filters);
        });
    },
    //���������� ���������
    updateFilter: function (params, callback) {
        userMagic.updateFilterParams(params, function (err, category) {

            if (err) return console.log(err,"updateCategory  userMagic.updateSchoolCategory err");

            callback(null, category);
        });
    },
    //�������� ���������
    removeFilters: function (category, callback) {
        userMagic.removeFilters(category, function (err, category) {

            if (err) return console.log(err,"removeCategory  userMagic.removeSchoolCategory err");

            callback(null, category);
        });
    },

    //Firewall rules
    removeIpFromLists: function (IP, callback) {
        userMagic.removeIPFormList(IP, function (err, message) {
            if (err) throw new Error(err,"removeIP  Firewall rules");
            callback(null, message);
        });
    },
    whiteList: function (IP, callback) {
        userMagic.addIPToWhiteList(IP, function (err, message) {
            if (err) throw new Error(err,"removeIP  Firewall rules");
            callback(null, message);
        });
    },
    blackList: function (IP, callback) {
        userMagic.addIPToBlackList(IP, function (err, message) {
            if (err) throw new Error(err,"removeIP  Firewall rules");
            callback(null, message);
        });
    },
    changeFirewallState: function (state, callback) {
        userMagic.changeState(state, function (err, message) {
            if (err) throw new Error(err,"removeIP  Firewall rules");
            callback(null, message);
        });
    },
    getAllLists: function (callback) {
        userMagic.getLists(function (err, lists) {
            if (err) throw new Error(err,"removeIP  Firewall rules");
            callback(null, lists);
        });
    },
    saveFirewallLists: function () {
        userMagic.getLists(function (err, rules) {
            if (err) throw new Error(err,"removeIP  Firewall rules");
            switch(rules[0].access){
                case "white":
                    console.log("true",rules[0].access);
                    saveFile({whiteList: rules[0].whiteList, blackList:[]});
                    break;
                case "black":
                    console.log("false",rules[0].access);
                    saveFile({whiteList: [], blackList:rules[0].blackList});
                    break;
                case "all":
                    console.log("null",rules[0].access);
                    saveFile({whiteList: [], blackList:[]});
                    break;
                default:
                    throw new Error("FirewallList undefined case");
            }
            function saveFile(object){
                fs.writeJson('./public/uploads/firewallRules.json', object, function(err){
                    if (err) throw  new Error(err)
                } )
            }
        });
    }
};
