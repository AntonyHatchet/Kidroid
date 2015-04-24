/**
 * Created by anton_gorshenin on 23.04.2015.
 */
var mongoose = require('mongoose');

var ApkSchema = mongoose.Schema({
    device:{
        Timestamp: String,
        device_id: String,
        token: String,
        latitude: Array,
        longitude: Array,
        apk_version: Number,
        loader_version: Number
    }
});

module.exports = mongoose.model('Apk', ApkSchema, "devices");