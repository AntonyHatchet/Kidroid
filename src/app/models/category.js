/**
 * Created by anton_gorshenin on 25.05.2015.
 */
var mongoose = require('mongoose');

var CategorySchema = mongoose.Schema({
    name: String
});

module.exports = mongoose.model('Category', CategorySchema, "category");