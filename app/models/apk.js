/**
 * Created by anton_gorshenin on 25.05.2015.
 */
var mongoose = require('mongoose');

var ApkSchema = mongoose.Schema({
    version: String,
    link: String
});

module.exports = mongoose.model('Apk', ApkSchema, "apk");