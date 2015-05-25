/**
 * Created by anton_gorshenin on 22.05.2015.
 */

module.exports = function (server) {
    var user = require('../routes/users.js');
    var io = require('socket.io').listen(server);

    io.on('connection', function(socket){

    //��������� �������� ������ 10 ��������� ����� ���������� �� ������������� ������  getDevicesByCount
        user.getDeviceByCount(function (err, Devices) {
            if (err) {
                console.log(err);
            }
            io.emit('displayData', Devices);
        },10);

    // ������ ��������� �� �������� �� �����������
        socket.on('getDevicesByCount', function(count){
                console.log(count,"count");
                user.getDeviceByCount(function (err, Devices) {
                       if (err) {
                           console.log(err);
                       }
                   io.emit('displayData', Devices);
               },count);
            }
        );
    //���������� ������������
        socket.on('disconnect', function(){
                console.log('user disconnected');}
        );
    });
};