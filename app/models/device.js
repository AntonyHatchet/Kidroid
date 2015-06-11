/**
 * Created by anton_gorshenin on 23.04.2015.
 */
var mongoose = require('mongoose');

var DeviceSchema = mongoose.Schema({
    school: String,
    timestamp: Date,
    deviceId: Number,
    token: String,
    latitude: Array,
    longitude: Array,
    apk: {
        version: Number,
        build: Number
    },
    apkToUpdate: {
        version: Number,
        build: Number,
        status: String
    },
    loader: Number,
    name: String,
    comment: String,
    registered: Boolean,
    updateRequired: Boolean,
    status: String,
    android: Number
});

module.exports = mongoose.model('Device', DeviceSchema, "devices");