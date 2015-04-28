/**
 * Created by anton_gorshenin on 23.04.2015.
 */
var mongoose = require('mongoose');

var ApkSchema = mongoose.Schema({
    device: {
        school: String,
        timestamp: String,
        device_id: String,
        token: String,
        latitude: Array,
        longitude: Array,
        apk_version: String,
        last_apk_version: String,
        loader_version: String,
        name: String,
        comment: String
    }
});

module.exports = mongoose.model('Apk', ApkSchema, "devices");