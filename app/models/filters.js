/**
 * Created by anton_gorshenin on 10.06.2015.
 */
var mongoose = require('mongoose');

var FilterSchema = mongoose.Schema({
    name: String,
    params: Array
});

module.exports = mongoose.model('Filter', FilterSchema, "filter");