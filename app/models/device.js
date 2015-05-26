/**
 * Created by anton_gorshenin on 23.04.2015.
 */
var mongoose = require('mongoose');

var DeviceSchema = mongoose.Schema({
        school: String,
        timestamp: String,
        device_id: String,
        token: String,
        latitude: Array,
        longitude: Array,
        apk_version: String,
        loader_version: String,
        name: String,
        comment: String,
        registered:Boolean
});

module.exports = mongoose.model('Device', DeviceSchema, "devices");