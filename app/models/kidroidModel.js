/**
 * Created by anton_gorshenin on 08.06.2015.
 */
var mongoose = require('mongoose');

var KidroidSchema = mongoose.Schema({
    loader: Number,
    default: Boolean
});

module.exports = mongoose.model('Kidroid', KidroidSchema, "kidroid");