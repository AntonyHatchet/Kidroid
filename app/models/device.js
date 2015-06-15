/**
 * Created by anton_gorshenin on 23.04.2015.
 */
var mongoose = require('mongoose');

var DeviceSchema = mongoose.Schema({
    _id:Number,
    school: String,
    timestamp: Date,
    //TODO убрать deviceID как не нужный элемент
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
    android: Number,
    filter2: String
});

module.exports = mongoose.model('Device', DeviceSchema, "devices");