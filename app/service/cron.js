var schedule = require('node-schedule');
var device = require('../routes/device.js');
var rule = new schedule.RecurrenceRule();
rule.minute = null;

//setInterval(device.checkStatus(),30000);
//schedule.scheduleJob(rule, function(){
//    //console.log("Cron job is working" + new Date());
//    device.checkStatus();
//});