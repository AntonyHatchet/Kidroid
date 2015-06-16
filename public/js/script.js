/**
 * Created by nikolay_ivanisenko on 25.05.2015.
 */



$(document).ready(function () {



    $('ul.tabsMy li').click(function () {
        var tab_id = $(this).attr('data-tab');

        $('ul.tabsMy li').removeClass('active');
        $('.tab-content').removeClass('current');

        $(this).addClass('active');
        $("#" + tab_id).addClass('current');
    })

});
$(document).ready(function () {

    $('ul.nav-tabs li').click(function () {
        var tab_id = $(this).attr('data-tab');

        $('ul.nav-tabs li').removeClass('active');
        $('.nav-tab-content').removeClass('current');

        $(this).addClass('active');
        $("#" + tab_id).addClass('current');
    })

});
function createNewCategory() {
    var nameCategory = $("#newCategory").val();
    if(nameCategory !=0){
        console.log('yes');
        socket.emit('createFilter', {"name":"School","params": nameCategory });
        $('#errorCreateCategory').addClass('no-show');
    }else{
        console.log('no');
        $('#errorCreateCategory').removeClass('no-show');
    }

    //console.log(nameCategory);
};

function createNewFilter() {
    var nameFilter = $("#paramFilter").val();
    if(nameFilter !=0){
        socket.emit('createFilter', {"name":"Filter2","params": nameFilter });
        $('#errorCreateCategory').addClass('no-show');
    }else{
        console.log('no');
        $('#errorCreateCategory').removeClass('no-show');
    };
};
//TO DO =====================
var idDevice;
var tokenDevice;
var newUsersId;

function editFilters(context) {
    console.log(context.parentNode.parentNode.childNodes[1].val());
};
function editUsers(x) {
    newUsersId= x.split(' ')[0];
    $('#newNameUsers').attr("value",x.split(' ')[2])
};

function inputNewNameCategory() {
    var device = {};
    device.id = newNameId;
    device.newName = $("#newNameCategory").val();
    socket.emit('editCategory', device);
    //console.log(device);
};
function inputNewNameUser() {
    var device = {};
    device.id = newUsersId;
    device.newName = $("#newNameUsers").val();
    device.newPassword = $("#newNamepassword").val();
    var newPassword2 = $("#newNamepassword2").val();
    if(device.newPassword == newPassword2 && device.newName && newPassword2){
        console.log('yes');
        $('#errorUsersPassword').addClass('no-show');
        $('#errorUsersName').addClass('no-show');
        $('.close').click();
        return socket.emit('updateUser', device);
    }if(device.newPassword != newPassword2 ){
        $('#errorUsersPassword').removeClass('no-show');
        $('#errorUsersName').addClass('no-show');
        return newPassword2;
    }else{
        $('#errorUsersName').removeClass('no-show');
        $('#errorUsersPassword').addClass('no-show');
    }
};

function editDeviceWriteIdToken(id, token){
    idDevice=id;
    tokenDevice=token;
}
function editDevice(){
    var device = {};
    device.id = idDevice;
    device.school = $("#editDeviceCategory").val();
    device.filter2 = $("#editDeviceFilter2").val();
    device.comments = $("#newComment").val();
    if(device.category !=0) {
        $('#editDevice .close').click();
        socket.emit('updateDevice', device);
        $('#errorEditDevice').addClass('no-show');
    }else{
        $('#errorEditDevice').removeClass('no-show');
    }
    //console.log(device);
}
var params = {};
function sort(place) {
    var elem = document.getElementById('paged').getElementsByTagName('th');
    if (place) {
        switch (+place.dataset.id) {
            case 1:
                (+elem[1].dataset.sort == 1) ? elem[1].dataset.sort = -1 : elem[1].dataset.sort = 1;
                params = {
                    "_id": +elem[1].dataset.sort
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
}
function uploadChangeApk(){
    $('#uploadApk').click();
}
function uploadChangeKidroid(){
    $('#uploadKidroid').click();
}
function deployAPK(){
    var version = $("#selectVersionApkToDeploy").val().split(' ')[0];
    socket.emit("deployApk",version)
}
function uploadChangeKidroid(){
    $('#uploadKidroid').click();
}
function deployKidroid(){
    var version = $("#kidroidVersionDeploy").val().split(' ')[0];
    socket.emit("deployKidroid",version)
}
function find(sort) {
    console.log(sort);
    var device = {};
    device.sort = (!sort)?{}:sort;
    device.search = $("#DeviceNameIDSerial").val();
    device.status = $("#selectStatus").val();
    device.school = $("#selectCategory").val();
    device.filter2 = $("#customFilter").val();
    device.build = $("#marionetteVersion").val();
    socket.emit('getDevicesByParams', device);
    socket.emit('getDeviceIdByParams', device);
    socket.emit('getDevicesQuantityByParams', device);
};
function page(i) {
    var device = {};
    device.sort = sort();
    device.search = $("#DeviceNameIDSerial").val();
    device.status = $("#selectStatus").val();
    device.school = $("#selectCategory").val();
    device.filter2 = $("#customFilter").val();
    device.build = $("#marionetteVersion").val();
    device.page = i*10-10;
    socket.emit('getDevicesByParams', device);
    socket.emit('getDevicesQuantityByParams', device);
};
function addDevice() {
    var device = {};
    device.category = $("#addSelectCategory").val();
    device.build = $("#addSelectVersion").val();
    device.numberDevice = $("#amountDevice").val();
    device.filter2 = $("#filter2").val();
    console.log(device);
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
    //console.log(device);
}
$(document).ready( function() {
    $("#checkAllSchedule").click( function() {
        if($('#checkAllSchedule').prop('checked')){
            $('.checkSchedule:enabled').prop('checked', true);
            //console.log('true');
        } else {
            $('.checkSchedule:enabled').prop('checked', false);
            //console.log('false');
        }
    });
    $("#checkboxWarning").click( function() {
        if($('#checkboxWarning').prop('checked')){
            $('.checkboxWarning:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkboxWarning:enabled').prop('checked', false);
            console.log('false');
        }
    });
    $("#checkAllUsers").click( function() {
        if($('#checkAllUsers').prop('checked')){
            $('.checkAllUsers:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkAllUsers:enabled').prop('checked', false);
            console.log('false');
        }
    });
    $("#checkAllFilters").click( function() {
        if($('#checkAllFilters').prop('checked')){
            $('.checkAllFilters:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkAllFilters:enabled').prop('checked', false);
            console.log('false');
        }
    });
    $("#checkAllCategory").click( function() {
        if($('#checkAllCategory').prop('checked')){
            $('.checkAllCategory:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkAllCategory:enabled').prop('checked', false);
            console.log('false');
        }
    });
    $("#checkAllMarionetteAPK").click( function() {
        if($('#checkAllMarionetteAPK').prop('checked')){
            $('.checkAllMarionetteAPK:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkAllMarionetteAPK:enabled').prop('checked', false);
            console.log('false');
        }
    });
    $("#checkAllKidroidVersion").click( function() {
        if($('#checkAllKidroidVersion').prop('checked')){
            $('.checkAllKidroidVersion:enabled').prop('checked', true);
            console.log('true');
        } else {
            $('.checkAllKidroidVersion:enabled').prop('checked', false);
            console.log('false');
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
    device.devices = $('input:checkbox:checked').map(function() {return this.value;}).get();
    device.version =$('#scheduleDeviceVersion').val().split(' ')[1];
    //console.log(device.devices);

    if (device.devices ==0 || device.date == ''){
        $('#errorAddSchedule').removeClass('no-show');

    }
    else {
        socket.emit('createSchedule', device)
        $('#editSchedule').removeClass('.in')
            .attr('aria-hidden', true)
            .css('z-index','-1')
            .css('opacity','0')
            .css('display','none');
        $('#errorAddSchedule').addClass('no-show');
        //console.log(device.devices);
    }
    //console.log(device);
}

function dellDevice(){
    var device ={};
    device.devices = $('input:checkbox:checked').map(function() {return this.value;}).get();
    socket.emit('removeDevice', device.devices)
    //console.log(device.devices);
}
function dellUsers(){
    var device ={};
    device.devices = $('input:checkbox.checkAllUsers:checked').map(function() {return this.value;}).get();
    socket.emit('removeUsers', device.devices)
    //console.log(device.devices);
}
function dellCategory(){
    var device ={};
    device.devices = $('input:checkbox.checkAllCategory:checked').map(function() {return this.value;}).get();
    socket.emit('removeCategory', device.devices)
    //console.log(device.devices);
}
function dellFilters(){
    var device ={};
    device.devices = $('input:checkbox.checkAllFilters:checked').map(function() {return this.value;}).get();
    socket.emit('removeFilters', device.devices)
    //console.log(device.devices);
}
function delMarionetteAPK(){
    var device ={};
    device.devices = $('input:checkbox.checkAllMarionetteAPK:checked').map(function() {return this.value;}).get();
    socket.emit('removeMarionetteAPK', device.devices)
    //console.log(device.devices);
}
function delKidroidVersion(){
    var device ={};
    device.devices = $('input:checkbox.checkAllKidroidVersion:checked').map(function() {return this.value;}).get();
    socket.emit('removeKidroidVersion', device.devices)
    //console.log(device.devices);
}

$(document).ready(function () {
    $('#closeScheduleModal, #closeScheduleModal1').click(function(){
       $('#editSchedule').removeClass('.in')
           .attr('aria-hidden', true)
           .css('z-index','-1')
           .css('opacity','0')
           .css('display','none');
    });
})
$(document).ready(function () {
    $('#closeIdTextarea, #closeIdTextarea1').click(function(){
       $('#addDevice').css('display','block');
       $('#idDevice').removeClass('.in')
           .attr('aria-hidden', true)
           .css('z-index','-1')
           .css('opacity','0')
           .css('display','none');
    });
})

$(window).scroll(function(){
//box one
    var $win = $(window);
    $('#tab').css('left', -$win.scrollLeft());
});

//===================
