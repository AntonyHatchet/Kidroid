/**
 * Created by nikolay_ivanisenko on 25.05.2015.
 */
$(document).ready(function () {

    $('ul.tabs li').click(function () {
        var tab_id = $(this).attr('data-tab');

        $('ul.tabs li').removeClass('current');
        $('.tab-content').removeClass('current');

        $(this).addClass('current');
        $("#" + tab_id).addClass('current');
    })

});

function createNewCategory() {
    var nameCategory = $("#newCategory").val();
    socket.emit('createCategory', {name: "" + nameCategory + ""});
    console.log(nameCategory);
};

function find() {
    var device = {};
    device.id = $("#DeviceNameIDSerial").val();
    device.status = $("#selectStatus").val();
    device.category = $("#selectCategory").val();
    device.version = $("#selectVersion").val();
    socket.emit('getDevicesByParams', device);
};
function page(i) {
    var device = {};
    device.id = $("#DeviceNameIDSerial").val();
    device.status = $("#selectStatus").val();
    device.category = $("#selectCategory").val();
    device.version = $("#selectVersion").val();
    device.page = i*10-10;
    socket.emit('getDevicesByParams', device);
};
function addDevice() {
    var device = {};
    device.category = $("#addSelectCategory").val();
    device.version = $("#addSelectVersion").val();
    device.numberDevice = $("#amountDevice").val();
    socket.emit('createDevice', device);
    console.log(device);
};
