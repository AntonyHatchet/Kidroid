/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var User = require('../models/user');
var Category = require('../models/category');
var Version = require('../models/apk_models');
var Kidroid = require('../models/kidroidModel');
var Device = require('../models/device');


module.exports = {
    findAllUsers: function (callback) {
        User.find("",{"local.name":1}, function (err, data) {

            if (err) return console.log(err,"findAllUsers User.find err");

            if (data != null) {
                callback(null, data)
            }
        });
    },
    removeUsers: function (data, callback) {
        User.remove({"_id": data}, function (err, category) {

            if (err) return console.log(err,"removeUsers User.remove err");

            if (category != null) {

                User.find("", function (err, category) {

                    if (err) {
                        throw err;
                    }

                    if (category != null) {

                        callback(null, category)

                    }
                });
            }
        });
    },
    updateDeviceInfo: function (data, callback) {

        Device.findOne({"deviceId": data.id}, function (err, category) {

            if (err) return console.log(err,"updateDeviceInfo Device.findOne err");

            if (category != null) {
                // Нашли такой ID, создаем дату для записи в БД.
                var update = {
                    "name": data.name,
                    "comment": data.comments,
                    "school": data.category,
                    "apkToUpdate": data.version,
                    "updateRequired" : true
                };
                //Пишем в БД к ID из запроса
                Device.update({"deviceId": data.id}, {$set: update},{$upsert: true}, function (err, updated) {

                    if (err) return console.log(err,"updateDeviceInfo Device.update err");

                    if (updated != null){
                        Device.find("", function (err, category) {

                            if (err) return console.log(err,"updateDeviceInfo Device.find err");

                            if (category != null) {
                                return callback(null, category)
                            }
                        });
                    }
                    // Execute callback passed from route
                });
            }
        });
    },
    findAllCategory: function (callback) {
        Category.find("", function (err, category) {

            if (err) return console.log(err,"findAllCategory Category.find err");

            if (category != null) {
                callback(null, category)
            }
        });
    },
    createSchoolCategory: function (data, callback) {
        Category.findOne({"name": data.name}, function (err, category) {

            if (err) return console.log(err,"createSchoolCategory Category.findOne err");

            if (category == null) {
                var newCategory = new Category({
                    name: data.name
                });

                newCategory.save(function (err) {

                    if (err) return console.log(err,"createSchoolCategory newCategory.save err");

                    Category.find("", function (err, category) {

                        if (err) return console.log(err,"createSchoolCategory Category.find err");

                        if (category != null) {
                            callback(null, category)
                        }
                    });
                });
            }
            callback(null, category)
        })
    },
    updateSchoolCategory: function (data, callback) {
        //Пишем в БД к ID из запроса
        Category.update({"_id": data.id}, {$set: {"name": data.newName}}, function (err, updated) {

            if (err) return console.log(err,"updateSchoolCategory Category.update err");

            if (updated != null){
                Category.find("", function (err, category) {

                    if (err) return console.log(err,"updateSchoolCategory Category.find err");

                    if (category != null) {
                        callback(null, category)
                    }
                });
            }
            // Execute callback passed from route
        });
    },
    removeSchoolCategory: function (data, callback) {
        Category.remove({"_id": data}, function (err, category) {

            if (err) return console.log(err,"removeSchoolCategory Category.remove err");

            if (category != null) {

                Category.find("", function (err, category) {

                    if (err) return console.log(err,"removeSchoolCategory Category.find err");

                    if (category != null) {

                        callback(null, category)

                    }
                });
            }
        });
    },
    findAllVersion: function (callback) {
        Version.find("", function (err, version) {

            if (err) return console.log(err,"findAllVersion Version.find err");

            if (version != null) {
                Kidroid.find("", function (err, kidroid) {

                    if (err) return console.log(err,"findKidroidVersion Kidroid.find err");

                    if (version != null) {
                        callback(null, {"apk":version,"kidroid":kidroid})
                    }
                });
            }
        });
    },
    findDefaultVersion: function (callback) {
        Version.find({"default":true}, function (err, version) {

            if (err) return console.log(err,"findAllVersion Version.find err");

            if (version != null) {
                Kidroid.find({"default":true}, function (err, kidroid) {

                    if (err) return console.log(err,"findKidroidVersion Kidroid.find err");

                    if (version != null) {
                        callback(null, {"apk":version,"kidroid":kidroid})
                    }
                });
            }
        });
    },
    findLink: function (build,callback) {

        Version.find({'apk.build':+build},{"_id":0,"link":1}, function (err, data) {

            if (err) return console.log(err,"findLink Version.find err");

            if (data != null) {
                console.log(data,"Link data");
                callback(null, data)
            }
        });
    },
    createVersion: function (data, callback) {

        Version.findOne({"apk.build": data.build}, function (err, category) {

            if (err) return console.log(err,"createVersion Version.findOne err");

            if (category == null) {
                var newVersion = new Version({
                    apk: {
                        build: +data.build,
                        version: +data.version.slice(1)
                    },
                    default: false,
                    link: data.link
                });

                newVersion.save(function (err) {

                    if (err) return console.log(err,"createVersion newVersion.save err");

                    Version.find("", function (err, category) {

                        if (err) return console.log(err,"createVersion Version.find err");

                        if (category != null) {
                            callback(null, category)
                        }
                    });
                });
            }
            callback(null, 0)
        })
    },
    makeDefault: function (location ,id, callback) {

        location.update({},{$set:{"default":false}}, function (err, data) {

            if (err) return console.log(err,"makeDefault location.update err");

            location.update({"_id": data.id},{$set:{"default":false}}, function(err,data){
                if (err) return console.log(err,"makeDefault location.update 2 err");

                callback(err,data)
            })
        })
    },
    removeVersion: function (data, callback) {
        Version.remove({"_id": data}, function (err, category) {

            if (err) return console.log(err,"removeVersion Version.remove err");

            if (category != null) {

                Version.find("", function (err, category) {

                    if (err) return console.log(err,"removeVersion Version.find err");

                    if (category != null) {

                        callback(null, category)

                    }
                });
            }
        });
    }
};