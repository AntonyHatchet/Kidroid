/**
 * Created by anton_gorshenin on 25.05.2015.
 */
var mongoose = require('mongoose');

var ApkSchema = mongoose.Schema({
    apk: {
        version: Number,
        build: Number
    },
    default: Boolean,
    date: Date,
    link: String,
    user: String
});

module.exports = mongoose.model('Apk', ApkSchema, "apk");