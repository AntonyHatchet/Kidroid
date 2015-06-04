var schedule = require('node-schedule');
var device = require('../routes/device.js');
var Cron = require('../dbMagic/cronMagic');
var rule = new schedule.RecurrenceRule();
rule.second = 0;

var j = schedule.scheduleJob(rule, function () {
    device.checkStatus();
    Cron.checkScheduleStart();
});
