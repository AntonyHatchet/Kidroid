/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var User = require('../models/user');
var Category = require('../models/category');
var Version = require('../models/category');

module.exports = {
    findAllCategory: function(callback){
        Category.find("", function(err, category) {

            if (err) {
                throw err;
            }

            if (category != null) {
                callback(null, category)
            }
        });
    },
    createSchoolCategory: function (data, callback) {
        console.log(data.name);
        Category.findOne({"name": data.name}, function (err, category) {
            if (err) {
                callback(null,err);
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

        Category.findOne({"_id": data.id}, function(err, category){
            if (err) {
                throw err;
            }
            if (category != null ){
                // Нашли такой ID, создаем дату для записи в БД.
                var update = {
                    "name"     : data.newName
                };
                //Пишем в БД к ID из запроса
                Category.update({"_id": data.id }, {$set: update},function (err, updated) {
                    if (err) {
                        console.log("not updated", err);
                    }
                    callback(updated);
                    // Execute callback passed from route
                });
            }
            console.log("find err",err);
            callback(err);
        });
    },
    removeSchoolCategory: function (data, callback) {
        Category.remove({"_id": data}, function(err, category) {

            if (err) {
                throw err;
            }

            if (category != null) {

                Category.find("", function(err, category) {

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
    findAllVersion: function(callback){
        Version.find("", function(err, category) {

            if (err) {
                throw err;
            }

            if (category != null) {
                callback(null, category)
            }
        });
    },
    createVersion: function (data, callback) {
        Version.findOne({"version_apk": data.version}, function (err, category) {
            if (err) {
                callback(null,err);
            }
            if (category == null) {
                var newVersion = new Category({
                    version_apk: data.version,
                    link: data.link,
                    update_required: false
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
            callback(null, category)
        })
    },
    removeVersion: function (data, callback) {
        Version.remove({"_id": data}, function(err, category) {

            if (err) {
                throw err;
            }

            if (category != null) {

                Category.find("", function(err, category) {

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