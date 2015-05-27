/**
 * Created by anton_gorshenin on 22.05.2015.
 */

module.exports = function (server) {
    var user = require('../routes/users.js');
    var io = require('socket.io').listen(server);

    io.on('connection', function (socket) {

        user.getAllDeviceQuantity(function (err, Quantity) {
            if (err) {
                console.log(err);
            }
            io.emit('quantity', Quantity);
        });
        //��������� �������� ������ 10 ���������
        user.getDevice(function (err, Devices) {
            if (err) {
                console.log(err);
            }
            io.emit('displayData', Devices);
        });
        
        user.findCategory(function (err, categories) {
            if (err) {
                console.log(err);
            }
            io.emit('category', categories);
        });

        user.findAllVersion(function (err, version) {
            if (err) {
                console.log(err);
            }
            io.emit('version', version);
        });

        // ������ ��������� �� �������� �� �����������
        socket.on('getDevicesByParams', function (params) {
                console.log(params, "getDevicesByParams");
                user.getDevice(function (err, Devices) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('displayData', Devices);
                }, params);
            }
        );
        // ������� ���������
        socket.on('createCategory', function (categoryName) {

                user.createCategory(categoryName, function (err, category) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('category', category);
                });
            }
        );
        socket.on('updateCategory', function (categoryParams) {

                user.updateCategory(categoryParams, function (err, category) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('category', category);
                });
            }
        );
        socket.on('removeCategory', function (categoryID) {

                user.removeCategory(categoryID, function (err, category) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('category', category);
                });
            }
        );
        socket.on('createDevice', function (paramsDevice) {

                user.createCategory(paramsDevice, function (err, params) {
                    if (err) {
                        console.log(err);
                    }
                    io.emit('category', params);
                });
            }
        );
        //���������� ������������
        socket.on('disconnect', function () {
                console.log('user disconnected');
            }
        );
    });
};