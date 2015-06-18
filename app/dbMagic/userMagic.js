/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var User = require('../models/user');
var Category = require('../models/category');
var Version = require('../models/apk_models');
var Kidroid = require('../models/kidroidModel');
var Device = require('../models/device');
var Filters = require('../models/filters');


module.exports = {
    findById: function (id,callback) {
        console.log(id,"findById");
            User.findOne({"_id": id}, {"local.name": 1}, function (err, data) {

                if (err) return console.log(err, "findById User.findOne err");

                if (data != null) {
                    callback(null, data)
                }
            })
    },
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

        Device.findOne({"_id": data.id}, function (err, category) {

            if (err) return console.log(err,"updateDeviceInfo Device.findOne err");

            if (category != null) {
                // Нашли такой ID, создаем дату для записи в БД.
                var update = {
                    "comment": data.comments,
                    "school": data.school,
                    "filter2": data.filter2
                };
                //Пишем в БД к ID из запроса
                Device.update({"_id": data.id}, {$set: update},{$upsert: true}, function (err, updated) {

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
    updateUserInfo: function (data, callback) {
        console.log(data)
        User.findOne({'local.name': data.newName}, function (err, user) {

            console.log(err,"err",user,"user")
            // if there are any errors, return the error
            if (err)
                return done(err);

            // check to see if theres already a user with that email
            if (user) {
                var newUserPassword = new User();

                // set the user's local credentials
                newUserPassword.local.password = newUserPassword.generateHash(data.newPassword);

                // save the user
                User.update({'local.name': data.newName},{$set:{'local.password':newUserPassword.local.password}},function (err) {
                    if (err)
                        throw err;
                    module.exports.findAllUsers(function(err,data){
                        callback(err,data)
                    })
                });
            }
            if (user == null) {
                User.findOne({'_id': data.id}, function (err, user) {
                    if (err)
                        return done(err);
                    if (user) {
                        var newUserPassword = new User();

                        // set the user's local credentials
                        newUserPassword.local.password = newUserPassword.generateHash(data.newPassword);

                        // save the user
                        User.update({'_id': data.id}, {
                            $set: {
                                'local.name': data.newName,
                                'local.password': newUserPassword.local.password
                            }
                        }, function (err) {
                            if (err)
                                throw err;
                            module.exports.findAllUsers(function(err,data){
                                callback(err,data)
                            })
                        });
                    }
                });
            }
        });
    },
    createNewFilter: function (data, callback) {
        console.log(data,"createNewFilter data");
        Filters.update({"name": data.name},{$addToSet:{"params":data.params}},{$upsert:true}, function (err, filters) {

            if (err) return console.log(err,"createNewFilter Filter.findOne err");

            Filters.find("", function (err, filters) {

                if (err) return console.log(err,"createNewFilter Filter.find err");

                if (filters != null) {
                    callback(null, filters)
                }
            });
        })
    },
    findAllFilter: function (callback) {
        Filters.find("", function (err, filters) {

            if (err) return console.log(err,"findAllFilter Filters.find err");

            if (filters != null) {
                callback(null, filters)
            }
        });
    },
    findFilterByQuery: function (callback,data) {
        var name = data.name;
        var query =  {$regex :new RegExp(data.params, 'i')};
        Filters.aggregate({"params.$.name": query}, function (err, filters) {
            console.log(filters)
            if (err) return console.log(err,"findAllFilter Filters.find err");

            if (filters != null) {
                callback(null, filters)
            }
        });
    },
    updateFilterParams: function (data, callback) {
        //Пишем в БД к ID из запроса
        Filters.update({"params": data.oldName}, {$set: {"params.$": data.newName}}, function (err, updated) {

            if (err) return console.log(err,"updateSchoolCategory Category.update err");

            if (updated != null){
                Filters.find("", function (err, category) {

                    if (err) return console.log(err,"updateSchoolCategory Category.find err");

                    if (category != null) {
                        callback(null, category)
                    }
                });
            }
            // Execute callback passed from route
        });
    },
    removeFilters: function (data, callback) {
        Filters.update({"name": data.name},{$pull:{"params":data.filter}}, function (err, category) {

            if (err) return console.log(err,"removeSchoolCategory Category.remove err");
            console.log(category)
            if (category != null) {

                Filters.find("", function (err, category) {

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
    findLinkApk: function (build,callback) {

        Version.find({'apk.build':+build},{"_id":0,"link":1}, function (err, data) {

            if (err) return console.log(err,"findLink Version.find err");

            if (data != null) {
                console.log(data,"Link data");
                callback(null, data)
            }
        });
    },
    findLinkKidroid: function (build,callback) {

        Kidroid.find({'loader':build},{"_id":0,"link":1}, function (err, data) {

            if (err) return console.log(err,"findLink Version.find err");

            if (data != null) {
                console.log(data,"Link data");
                callback(null, data)
            }
        });
    },
    createVersionApk: function (data, callback) {
        console.log(data,"createVersion data")
        Version.findOne({"apk.build": data.build}, function (err, category) {

            if (err) return console.log(err,"createVersion Version.findOne err");

            if (category == null) {
                var newVersion = new Version({
                    apk: {
                        build: +data.build,
                        version: +data.version
                    },
                    default: false,
                    link: data.link,
                    user: data.user,
                    date: new Date()
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
    createVersionKidroid: function (data, callback) {
        console.log(data,"createVersionKidroid data")
        Kidroid.findOne({"loader": data.loader}, function (err, category) {

            if (err) return console.log(err,"createVersionKidroid Version.findOne err");

            if (category == null) {
                var newVersion = new Kidroid({
                    loader: data.loader,
                    default: false,
                    link: data.link,
                    user: data.user,
                    date: new Date()
                });

                newVersion.save(function (err) {

                    if (err) return console.log(err,"createVersionKidroid newVersion.save err");

                    Kidroid.find("", function (err, category) {

                        if (err) return console.log(err,"createVersionKidroid Version.find err");

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
        Version.find({"_id": data}, function (err, category) {

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