var schedule = require('node-schedule');
var device = require('../routes/device.js');

module.exports = {
    startCheckStatus: function(rule) {
        schedule.scheduleJob({second:rule}, function () {
            device.checkStatus()
        })
    },
    newTaskScheduled: function(data, callback){

    }
};
