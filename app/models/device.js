/**
 * Created by anton_gorshenin on 23.04.2015.
 */
var mongoose = require('mongoose');

var DeviceSchema = mongoose.Schema({
    _id:Number,
    school: String,
    timestamp: Date,
    token: String,
    latitude: Array,
    longitude: Array,
    apk: {
        version: String,
        build: String
    },
    apkToUpdate: {
        version: String,
        build: String,
        status: String
    },
    loader: String,
    kidroidToUpdate: String,
    name: String,
    comment: String,
    registered: Boolean,
    updateRequired: Boolean,
    status: String,
    android: Number,
    filter2: String
});

module.exports = mongoose.model('Device', DeviceSchema, "devices");