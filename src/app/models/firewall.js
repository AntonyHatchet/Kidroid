/**
 * Created by anton_gorshenin on 20.07.2015.
 */
var mongoose = require('mongoose');

var Firewall = mongoose.Schema({
    whiteList: Array,
    blackList: Array,
    access: String
});

module.exports = mongoose.model('Firewall', Firewall, "firewall");