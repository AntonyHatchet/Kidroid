/**
 * Created by anton_gorshenin on 23.04.2015.
 */
var mongoose = require('mongoose');

var DeviceSchema = mongoose.Schema({
    school: String,
    timestamp: Date,
    device_id: Number,
    token: String,
    latitude: Array,
    longitude: Array,
    apk_version: Number,
    apk_to_update: Number,
    loader_version: Number,
    name: String,
    comment: String,
    registered: Boolean,
    update_required: Boolean,
    online: Boolean
});

module.exports = mongoose.model('Device', DeviceSchema, "devices");