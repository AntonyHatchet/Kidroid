/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var User = require('../models/user');
var Category = require('../models/category');

module.exports = {
    createSchoolCategory: function (data, callback) {
        console.log(data,"data");
        Category.findOne({"category": data}, function(err, category) {

            if (err) {
                throw err;
            }

            if (category == null) {
                var newCategory = new Category({
                    school : data
                });

                newCategory.save(function (err) {

                    if (err) {
                        throw err;
                    }

                    Category.find("", function(err, category) {

                        if (err) {
                            throw err;
                        }

                        if (category != null) {
                            callback(null, category)
                        }
                    });
                });

            }
        });
    }
};