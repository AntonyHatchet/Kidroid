/**
 * Created by anton_gorshenin on 02.06.2015.
 */
var Cron = require('../models/cron');
var Device = require('../models/device');
module.exports = {
    newScheduleDevice: function(params, callback){
    console.log(params);
        var deviceId = {$gte:+params.id.start,$lte:params.id.end};
        var school = params.category;
        var build=  +params.build;

        Device
            .find({})
            .where('_id').equals((!deviceId)?{$exists: true}:deviceId)
            .where('school').equals((!school)?{$exists: true}:school)
            .where('apk.build').equals((!build)?{$exists: true}:build)
            .exec(function (err, Devices) {
                if (err) return console.log(err,"newScheduleDevice Device.find err");
                // Execute callback
                callback(null, Devices);
            });

    },
    newSchedule: function (job, callback) {
        console.log(job.version, "newShedule")
        var newCron = new Cron({
            "timeStart": job.date,
            "devices": job.devices,
            "versionToUpdate": {version:job.version,build:(job.build)?job.build:0},
            "status": "New",
            "name": job.name,
            "type": job.type,
            "school": job.school,
            "filter": job.filter,
            "deviceToUpdate": job.devices.length,
            "deviceUpdated":0
        });
        newCron.save(function (err) {
            if (err) {
                return console.log(err, "newSchedule err");
            }
            module.exports.getAllSchedule(function(err,cb){
               if (err) {
                   return console.log(err, "updateSchedule err");
               }
               callback(null,cb)
           })
        });
    },
    updateSchedule: function (job, callback) {
        var query = {
            "timeStart": job.date,
            "devices": job.devices,
            "versionToUpdate": {version:job.version,build:(job.build)?job.build:0},
            "status": "New",
            "deviceToUpdate": job.devices.length,
            "deviceUpdated":0
        };

        Cron.update({"_id":job.id},{$set:query},{$upsert:true},function (err,cb) {
            if (err) {
                return console.log(err, "updateSchedule err");
            }
            if (!cb){
                return console.log(cb, "updateSchedule cb");
            }
            module.exports.getAllSchedule(function(err,cb){
                if (err) {
                    return console.log(err, "updateSchedule err");
                }
                callback(null,cb)
            })
        });

    },
    getAllSchedule: function (callback,status,limit){
        status = (!status)? {$exists:true}:status;
        limit = (!limit)? 10:limit;
        Cron.find({"status":status}, function (err, jobs) {
            if (err) return console.log(err, "getAllSchedule");
            callback(null, jobs);
        }).limit(limit)
    },
    checkScheduleStatus: function (id,callback){
        Cron.findOne({"_id":id}, function (err, job) {

            if (err) return console.log(err,"checkScheduleStatus findOne");

            Device.find({"_id": {$gte:job.devices[0],$lte:job.devices[job.devices.length]}},function(err,data){
                if (err) return console.log(err,"checkScheduleStatus find");
                callback(null,data)
            });
        })
    },
    checkScheduleStart: function (){

        module.exports.getAllSchedule(function(err,cb){
                if (err) {
                    return console.log(err, "checkScheduleStart module.exports.getAllSchedule err");
                }
                cb.forEach(function(task){
                    var time = (task.timeStart - new Date)/60000;
                    if (time <= 0&& task.status === "New"){
                        module.exports.ScheduleStart(task)
                    }
                })
        },"New");
    },
    ScheduleStart: function (task){
        Cron.update({"_id":task._id},{$set:{"status":"Started"}},{$upsert:true},function (err,cb) {
            if (err) {
                return console.log(err, "updateSchedule err");
            }
            if (!cb){
                return console.log(cb, "updateSchedule cb");
            }
        });
        var id = task.devices;
        var version = task.versionToUpdate.version;
        var build = task.versionToUpdate.build;
        console.log(task,"task")
        console.log(id,"Updater")
        console.log(id.length,"Updater.length")
        Updater(0);
        function Updater(i){
            if (i < id.length){
                if (task.type === "Kidroid Loader"){
                    Device.update({"_id":+id[i]},{$set:{"kidroidToUpdate":version,"updateRequired":true,"task":task._id}},{$upsert:true}, function (err, updated) {
                        if (err) return console.log(err,"ScheduleStart Device.update err");
                        console.log("This device " + id[i] + "Kidroid is updated");
                        Updater(++i)
                    });
                }else if (task.type === "Marionette APK"){
                    Device.update({"_id":+id[i]},{$set:{"apkToUpdate.build":+build,"apkToUpdate.version":version,"updateRequired":true,"task":task._id}},{$upsert:true}, function (err, updated) {
                        if (err) return console.log(err,"ScheduleStart Device.update err");
                        console.log("This device " + id[i] + "Marionette is updated");
                        Updater(++i)
                    });
                }
            }
        }
        console.log("End")
    },
    counter: function(id,callback){
        Cron.update({"_id":id},{$inc:{"deviceUpdated":1}}, function (err, updated) {
            if (err) return console.log(err,"ScheduleStart Device.update err");
            callback(err,true)
        });
    }
};