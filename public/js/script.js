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
$(document).ready(function () {

    $('ul.nav-tabs li').click(function () {
        var tab_id = $(this).attr('data-tab');

        $('ul.nav-tabs li').removeClass('current');
        $('.nav-tab-content').removeClass('current');

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
var params = {};
function sort(place) {
    var elem = document.getElementById('paged').getElementsByTagName('th');
    if (place) {
        switch (+place.dataset.id) {
            case 1:
                (+elem[1].dataset.sort == 1) ? elem[1].dataset.sort = -1 : elem[1].dataset.sort = 1;
                params = {
                    "deviceId": +elem[1].dataset.sort
                };
                break;
            case 2:
                (+elem[2].dataset.sort == 1) ? elem[2].dataset.sort = -1 : elem[2].dataset.sort = 1;
                params = {
                    "name": +elem[2].dataset.sort
                };
                break;
            case 3:
                (+elem[3].dataset.sort == 1) ? elem[3].dataset.sort = -1 : elem[3].dataset.sort = 1;
                params = {
                    "apk.build": +elem[3].dataset.sort
                };
                break;
            case 4:
                (+elem[4].dataset.sort == 1) ? elem[4].dataset.sort = -1 : elem[4].dataset.sort = 1;
                params = {
                    "loader": +elem[4].dataset.sort
                };
                break;
            case 5:
                (+elem[5].dataset.sort == 1) ? elem[5].dataset.sort = -1 : elem[5].dataset.sort = 1;
                params = {
                    "status": +elem[5].dataset.sort
                };
                break;
            default:
                return params
        }
        return params
    }

    return params
};

function find(sort) {
    var device = {};
    device.sort = (!sort)?{}:sort;
    device.search = $("#DeviceNameIDSerial").val();
    device.status = $("#selectStatus").val();
    device.category = $("#selectCategory").val();
    device.version = $("#selectVersion").val().split(' ')[0];
    device.build = $("#selectVersion").val().split(' ')[1];
    socket.emit('getDevicesByParams', device);
    socket.emit('getDevicesQuantityByParams', device);
};
function page(i) {
    var device = {};
    device.sort = sort();
    console.log(device.sort,"page");
    device.search = $("#DeviceNameIDSerial").val();
    device.status = $("#selectStatus").val();
    device.category = $("#selectCategory").val();
    device.version = $("#selectVersion").val().split(' ')[0];
    device.build = $("#selectVersion").val().split(' ')[1];
    device.page = i*10-10;
    socket.emit('getDevicesByParams', device);
    socket.emit('getDevicesQuantityByParams', device);
    console.log(device);
};
function addDevice() {
    var device = {};
    device.category = $("#addSelectCategory").val();
    device.version = $("#addSelectVersion").val().split(' ')[0];
    device.build = $("#addSelectVersion").val().split(' ')[1];
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
    //var checked = [];
    start = $('#idStart').val();
    end = $('#idEnd').val();
    length = end-start;
    var i = 0;
    //while(++i <= length) {
    //    if (document.getElementsByName(i).checked) {
    //        checked.push(i);
    //    }
    //}

    var device ={};
    //for (var i = 0; i < length; i++){
    //    if($('#checkSchedule').attr('checked')){
    //        device.id = $('#checkSchedule').val();
    //    }
    //}
    da = $('#dateScheduleId').val();
    t = $('#timeSchedule').val();
    var neDate = Date.parse(da+'T'+t);
    device.date = neDate;
    device.devices = [];
        device.devices.push($("input:checked").val());
    device.Version =$('#scheduleDeviceVersion').val();
    if (device.devices ==0 || device.date == ''){
        $('#errorAddSchedule').removeClass('no-show');
        console.log('no');
    }
    else {
        socket.emit('createSchedule', device)
        $('#editSchedule').removeClass('.in')
            .attr('aria-hidden', true)
            .css('z-index','-1')
            .css('opacity','0')
            .css('display','none');
        $('#errorAddSchedule').addClass('no-show');
    }
    //console.log(device);
}

$(document).ready(function () {
    $('#closeScheduleModal').click(function(){
       $('#editSchedule').removeClass('.in')
           .attr('aria-hidden', true)
           .css('z-index','-1')
           .css('opacity','0')
           .css('display','none');
    });
})

