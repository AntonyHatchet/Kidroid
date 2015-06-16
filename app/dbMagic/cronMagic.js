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
            "versionToUpdate": +job.version,
            "status": "New",
            "name": job.name,
            "type": job.type
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
            "versionToUpdate": job.version,
            "status": "New"

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
    getAllSchedule: function (callback,status){
        status = (!status)? {$exists:true}:status;
        Cron.find({"status":status}, function (err, jobs) {
            if (err) return console.log(err, "getAllSchedule");
            callback(null, jobs);
        })
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
                    if (time <= 0){
                        module.exports.ScheduleStart(task)
                    }
                })
        },"New");
    },
    ScheduleStart: function (task){
        console.log("ScheduleStart");
        console.log(task,"task");
        var id = task.devices;
        var version = task.version;
        Updater(0);
        function Updater(i){
            if (i!=null && i < id.length){
                Device.update({"_id":+id[i]},{$set:{"apkToUpdate.build":+version,"updateRequired":true}}, function (err, updated) {
                    if (err) return console.log(err,"ScheduleStart Device.update err");
                    console.log("This device " + id[i] + "is updated");
                });
                Updater(i++)
            }
        }
        console.log("End")
    }
};