var schedule = require('node-schedule');
var device = require('../routes/device.js');
var Cron = require('../dbMagic/cronMagic');
var rule = new schedule.RecurrenceRule();

rule.minute = [0,20,40];

schedule.scheduleJob(rule, function () {
    console.log("Cron Started");
    device.checkStatus();
    Cron.checkScheduleStart();
});
