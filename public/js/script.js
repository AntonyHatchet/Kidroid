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
    if(nameCategory !=0){
        console.log('yes');
        socket.emit('createCategory', {name: "" + nameCategory + ""});
        $('#errorCreateCategory').addClass('no-show');
    }else{
        console.log('no');
        $('#errorCreateCategory').removeClass('no-show');
    }

    //console.log(nameCategory);
};
//TO DO =====================
var newNameId;
var idDevice;
var tokenDevice;

function renameCategoryId(x) {
    newNameId=x;
};


function inputNewNameCategory() {
    var device = {};
    device.id = newNameId;
    device.newName = $("#newNameCategory").val();
    socket.emit('editCategory', device);
    //console.log(device);
};

function editDeviceWriteIdToken(id, token){
    idDevice=id;
    tokenDevice=token;
}
function editDevice(){
    var device = {};
    device.id = idDevice;
    device.category = $("#editDeviceCategory").val();
    device.version = $("#editDeviceVersion").val();
    device.name = $("#newNameUser").val();
    device.comments = $("#newComment").val();
    socket.emit('updateDevice', device);
    console.log(device);
}

function find() {
    var device = {};
    device.search = $("#DeviceNameIDSerial").val();
    device.status = $("#selectStatus").val();
    device.category = $("#selectCategory").val();
    device.version = $("#selectVersion").val();
    socket.emit('getDevicesByParams', device);
    socket.emit('getDevicesQuantityByParams', device);
};
function page(i) {
    var device = {};
    device.search = $("#DeviceNameIDSerial").val();
    device.status = $("#selectStatus").val();
    device.category = $("#selectCategory").val();
    device.version = $("#selectVersion").val();
    device.page = i*10-10;
    socket.emit('getDevicesByParams', device);
    socket.emit('getDevicesQuantityByParams', device);
    console.log(device);
};
function addDevice() {
    var device = {};
    device.category = $("#addSelectCategory").val();
    device.version = $("#addSelectVersion").val();
    device.numberDevice = $("#amountDevice").val();
    if (device.category != 0 && device.version !=0)  {
    socket.emit('createDevice', device);
    $('#errorAddDevice').addClass('no-show');
    //console.log('yes');
    } else{
        $('#errorAddDevice').removeClass('no-show');
    }
};

function finsDeviceSchedule(){
    var device ={
        id:{
            start: $('#idStart').val(),
            end: $('#idEnd').val()
        }
    };
    device.school = $('#scheduleDeviceCategory').val();
    device.version = $('#scheduleDeviceVersionFilter').val();
    socket.emit('getDeviceForSchedule', device);
    console.log(device);
}
$(document).ready( function() {
    $("#checkAllSchedule").click( function() {
        if($('#checkAllSchedule').attr('checked')){
            $('.checkSchedule:enabled').attr('checked', true);
        } else {
            $('.checkSchedule:enabled').attr('checked', false);
        }
    });
});

function createSchedule(){
    start = $('#idStart').val();
    end = $('#idEnd').val();
    length = end-start;

    var device ={};
    for (var i = 0; i < length; i++){
        if($('#checkSchedule').attr('checked')){
            device.id = $('#checkSchedule').val();
        }
    }
    console.log(device);
}