/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var User = require('../models/user');
var Category = require('../models/category');

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

                var newCategory = new Category({
                    _id : data
                });

                newCategory.save(function (err) {

                    if (err) {
                        callback(null,err);
                    }

                    Category.find("", function(err, category) {

                        if (err) {
                            callback(null,err);
                        }

                        if (category != null) {
                            callback(null, category)
                        }
                    });
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
    }
};