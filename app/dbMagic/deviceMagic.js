/**
 * Created by anton_gorshenin on 24.04.2015.
 */
var Device = require('../models/apk');

module.exports = {
    getAllDevice: function(callback){
        var query = Device.find();
        query.exec(function (err, Devices) {
            // Execute callback
            console.log(Devices);
            callback(null, Devices);
        });
    }
};