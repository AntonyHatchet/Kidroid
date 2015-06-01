/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var User = require('../models/user');
var Category = require('../models/category');
var Version = require('../models/apk_models');
var Device = require('../models/device');


module.exports = {
    findAllUsers: function (callback) {
        User.find("",{"local.name":1}, function (err, data) {

            if (err) {
                throw err;
            }

            if (data != null) {
                console.log(data);
                callback(null, data)
            }
        });
    },
    removeUsers: function (data, callback) {
        User.remove({"_id": data}, function (err, category) {

            if (err) {
                throw err;
            }

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

        Device.findOne({"device_id": data.id}, function (err, category) {
            if (err) {
                throw err;
            }
            if (category != null) {
                // Нашли такой ID, создаем дату для записи в БД.
                var update = {
                    "name": data.name,
                    "comment": data.comments,
                    "school": data.category,
                    "apk_to_update": data.version,
                    "update_required" : true
                };
                //Пишем в БД к ID из запроса
                Device.update({"device_id": data.id}, {$set: update},{$upsert: true}, function (err, updated) {
                    if (err) {
                        console.log("not updated", err);
                    }
                    if (updated != null){
                        Device.find("", function (err, category) {

                            if (err) {
                               console.log(err,"find error ");
                            }

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

            if (err) {
                throw err;
            }

            if (category != null) {
                callback(null, category)
            }
        });
    },
    createSchoolCategory: function (data, callback) {
        //console.log(data.name);
        Category.findOne({"name": data.name}, function (err, category) {
            if (err) {
                callback(null, err);
            }
            if (category == null) {
                var newCategory = new Category({
                    name: data.name
                });

                newCategory.save(function (err) {

                    if (err) {
                        callback(null, err);
                    }

                    Category.find("", function (err, category) {

                        if (err) {
                            callback(null, err);
                        }

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

        Category.findOne({"_id": data.id}, function (err, category) {
            if (err) {
                throw err;
            }
            if (category != null) {
                // Нашли такой ID, создаем дату для записи в БД.
                var update = {
                    "name": data.newName
                };
                //Пишем в БД к ID из запроса
                Category.update({"_id": data.id}, {$set: update}, function (err, updated) {
                    if (err) {
                        console.log("not updated", err);
                    }
                    if (callback != null){
                        Category.find("", function (err, category) {

                            if (err) {
                                callback(null, err);
                            }

                            if (category != null) {
                                callback(null, category)
                            }
                        });
                    }
                    // Execute callback passed from route
                });
            }
            console.log("find err", err);
            callback(err);
        });
    },
    removeSchoolCategory: function (data, callback) {
        Category.remove({"_id": data}, function (err, category) {

            if (err) {
                throw err;
            }

            if (category != null) {

                Category.find("", function (err, category) {

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
    findAllVersion: function (callback) {
        Version.find("",{"_id":0,"version_apk":1}, function (err, version) {
            //console.log(version);
            if (err) {
                throw err;
            }

            if (version != null) {
                callback(null, version)
            }
        });
    },
    findLink: function (version,callback) {
        console.log(version,"try find version");
        Version.find({'version_apk':+version},{"_id":0,"link":1}, function (err, data) {
            if (err) {
                throw err;
            }
            if (data != null) {
                console.log(data,"Link data");
                callback(null, data)
            }
        });
    },
    createVersion: function (data, callback) {
        console.log(data,"version start saving to db");
        Version.findOne({"version_apk": data.version}, function (err, category) {
            if (err) {
                callback(null, err);
            }
            if (category == null) {
                var newVersion = new Version({
                    version_apk: data.version,
                    link: data.link
                });

                newVersion.save(function (err) {

                    if (err) {
                        callback(null, err);
                    }

                    Version.find("", function (err, category) {

                        if (err) {
                            callback(null, err);
                        }

                        if (category != null) {
                            callback(null, category)
                        }
                    });
                });
            }
            callback(null, 0)
        })
    },
    removeVersion: function (data, callback) {
        Version.remove({"_id": data}, function (err, category) {

            if (err) {
                throw err;
            }

            if (category != null) {

                Version.find("", function (err, category) {

                    if (err) {
                        throw err;
                    }

                    if (category != null) {

                        callback(null, category)

                    }
                });
            }
        });
    }
};