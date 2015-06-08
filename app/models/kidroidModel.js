/**
 * Created by anton_gorshenin on 08.06.2015.
 */
var mongoose = require('mongoose');

var KidroidSchema = mongoose.Schema({
    loader: Number,
    date: Date,
    default: Boolean,
    user: String
});

module.exports = mongoose.model('Kidroid', KidroidSchema, "kidroid");