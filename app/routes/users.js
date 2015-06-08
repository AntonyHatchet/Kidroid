'use strict';
var deviceMagic = require('../dbMagic/deviceMagic');
var userMagic = require('../dbMagic/userMagic');


// TODO ��� ������������ ����������� ������������� ������� �������� � �������� �� ���� ������� � ��������� ���� ������.
module.exports = {
    //������������
    //����� ���� �������������
    findAllUsers: function (callback) {
        userMagic.findAllUsers(function (err, data) {

            if (err) return console.log(err,"findAllUsers userMagic.findAllUsers err");

            callback(null, data);
        });
    },
    removeUsers: function (id, callback) {
        userMagic.removeUsers(id, function (err, data) {

            if (err) return console.log(err,"removeUsers userMagic.removeUsers err");

            callback(null, data);
        });
    },
    // ������
    createVersion: function (version, callback) {
        userMagic.createVersion(version, function (err, version) {

            if (err) return console.log(err,"createVersion userMagic.createVersion err");

            callback(null, version);
        });
    },
    removeVersion: function (category, callback) {
        userMagic.removeVersion(category, function (err, category) {

            if (err) return console.log(err,"removeVersion userMagic.removeVersion err");

            callback(null, category);
        });
    },
    //����� ���� ������
    findAllVersion: function (callback) {
        userMagic.findAllVersion(function (err, version) {

            if (err) return console.log(err,"findAllVersion userMagic.findAllVersion err");

            callback(null, version);
        });
    },
    makeDefaultVersion: function(location,id,callback){
        userMagic.makeDefault(location,id,function (err, version) {

            if (err) return console.log(err,"makeDefaultVersion userMagic.makeDefault err");

            module.exports.getDefaultVersion(function(err,versions){
                callback(null, versions);
            })
        });
    },
    getDefaultVersion: function(callback){

    },
    findLink: function (version,callback) {
        userMagic.findLink(version,function (err, link) {

            if (err) return console.log(err,"findLink userMagic.findLink err");

            callback(null, link);
        });
    },
    // ����������
    // ������� ����� ���������� ���������
    getAllDeviceQuantity: function (callback,params) {
        deviceMagic.getQuantity(function (err, Quantity) {

            if (err) return console.log(err,"getAllDeviceQuantity deviceMagic.getQuantity err");

            callback(null, Quantity);
        },params);
    },
    //������� ������
    removeDevice: function (id, callback) {
        deviceMagic.removeDevice(id, function (err, data) {

            if (err) return console.log(err,"removeDevice deviceMagic.removeDevice err");

            callback(null, data);
        });
    },
    // ��������� ����� ��������� c �����������
    getDevice: function (callback,params) {
        deviceMagic.getDevice(function (err, Devices) {

            if (err) return console.log(err,"getDevice deviceMagic.getDevice err");

            callback(null, Devices);
        },params);
    },
    //������� ������� � �� �� ���������� ���������
    createDevice: function (params, callback,end) {
        uploader(0);
        function uploader(i) {
            if (i < params.numberDevice) {
                deviceMagic.createDeviceId(function(err,id){

                    if (err) return console.log(err,"createDevice deviceMagic.createDeviceId err");

                    deviceMagic.saveDevice({
                            deviceID: id,
                            school: params.category,
                            version: params.version,
                            build: params.build
                        },
                        function (err,savedDevice) {

                            if (err) return console.log(err,"createDevice deviceMagic.saveDevice err");

                            deviceMagic.getDevice(function(err,data){

                                if (err) return console.log(err,"createDevice deviceMagic.getDevice err");

                                callback(null,data,savedDevice);
                                if (i == params.numberDevice){
                                    console.log("Use end callback");
                                    end(null,true);
                                }
                            });
                            uploader(++i);
                        });
                });
            }
        }
    },
    updateDevice: function (params, callback) {
       userMagic.updateDeviceInfo(params, function (err, devices) {

           if (err) return console.log(err,"updateDevice userMagic.updateDeviceInfo err");

            callback(null, devices);
        });
    },
    //���������
    //���������� ���������
    createCategory: function (category, callback) {
        userMagic.createSchoolCategory(category, function (err, category) {

            if (err) return console.log(err,"createCategory  userMagic.createSchoolCategory err");

            callback(null, category);
        });
    },
    //���������� ���������
    updateCategory: function (params, callback) {
        userMagic.updateSchoolCategory(params, function (err, category) {

            if (err) return console.log(err,"updateCategory  userMagic.updateSchoolCategory err");

            callback(null, category);
        });
    },
    //�������� ���������
    removeCategory: function (category, callback) {
        userMagic.removeSchoolCategory(category, function (err, category) {

            if (err) return console.log(err,"removeCategory  userMagic.removeSchoolCategory err");

            callback(null, category);
        });
    },
    //����� ���� ���������
    findCategory: function (callback) {
        userMagic.findAllCategory(function (err, category) {

            if (err) return console.log(err,"findCategory  userMagic.findAllCategory err");

            callback(null, category);
        });
    }
};
