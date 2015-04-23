/**
 * Created by anton_gorshenin on 23.04.2015.
 */
var mongoose = require('mongoose');

module.exports = mongoose.model('User',{
    username: String,
    password: String
 // permission: Array
});