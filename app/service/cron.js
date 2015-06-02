var schedule = require('node-schedule');
var device = require('../routes/device.js');
var Cron = require('../dbMagic/cronMagic');

schedule.scheduleJob({minutes:[0,20,40]}, function () {
    device.checkStatus();
    Cron.checkScheduleStart();
});
