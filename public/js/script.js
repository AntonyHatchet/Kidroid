/**
 * Created by nikolay_ivanisenko on 25.05.2015.
 */



$(document).ready(function () {


    if(location.hash) {
        $('ul.tabsMy li').removeClass('active');
        $('.tab-content').removeClass('current');
        $('a[href=' + location.hash + ']').tab('show');
        $(location.hash).addClass('current');
    }

    $(document.body).on("click", "a[data-toggle]", function(event) {
        location.hash = this.getAttribute("href");
    });

    $(window).on('popstate', function() {
        var anchor = location.hash || $("a[data-toggle=tab]").first().attr("href");
        $('a[href=' + anchor + ']').tab('show');
    });

    $('ul.tabsMy li').click(function () {
        var tab_id = $(this).attr('data-tab');

        $('ul.tabsMy li').removeClass('active');
        $('.tab-content').removeClass('current');

        $(this).addClass('active');
        $("#" + tab_id).addClass('current');
    })


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
        $('#errorCreateSchool').addClass('no-show');
        $('#completeCreateSchool').removeClass('no-show');
    }else{
        console.log('no');
        $('#errorCreateSchool').removeClass('no-show');
        $('#completeCreateSchool').addClass('no-show');
    }

    //console.log(nameCategory);
};

function createNewFilter() {
    var nameFilter = $("#paramFilter").val();
    if(nameFilter !=0){
        socket.emit('createFilter', {"name":"Filter2","params": nameFilter });
        $('#errorCreateFilter').addClass('no-show');
        $('#completeCreateFilter').removeClass('no-show');
    }else{
        console.log('no');
        $('#errorCreateFilter').removeClass('no-show');
        $('#completeCreateFilter').addClass('no-show');
    };
};
//TODO =====================
var idDevice;
var tokenDevice;
var newUsersId;

function editFilters(context) {
    //$("#newNameCategory").val(context.parentNode.parentNode.childNodes[1].innerText).attr("data-name",context.parentNode.parentNode.childNodes[1].innerText);
    $("#newNameCategory").attr("data-name",context).attr("value",context).attr("placeholder",context);
    //console.log(context);
};
function editUsers(x) {
    newUsersId= x.split(' ')[0];
    $('#newNameUsers').attr("value",x.split(' ')[2])
};

function inputNewNameCategory() {
    var device = {};
    device.oldName = $("#newNameCategory").attr("data-name");
    device.newName = $("#newNameCategory").val();
    if(device.newName != 0) {
        //console.log('yes');
        $('#errorEditFilters').addClass('no-show');
        $('#completeEditFilters').removeClass('no-show');
        socket.emit('editCategory', device);
    }else{
        //console.log('no');
        $('#errorEditFilters').removeClass('no-show');
        $('#completeEditFilters').addClass('no-show');
    }
    //console.log(device);
};
function inputNewNameUser() {
    var device = {};
    device.id = newUsersId;
    device.newName = $("#newNameUsers").val();
    device.newPassword = $("#newNamepassword").val();
    var newPassword2 = $("#newNamepassword2").val();
    if(device.newPassword == newPassword2 && newPassword2!=0 && device.newName!=0){
        //console.log('yes');
        $('#errorUsersPassword').addClass('no-show');
        $('#errorUsersName').addClass('no-show');
        $('#completeUsersEdit').removeClass('no-show');
        $('.close').click();
        return socket.emit('updateUser', device);
    }if(device.newPassword != newPassword2 ){
        $('#errorUsersPassword').removeClass('no-show');
        $('#errorUsersName').addClass('no-show');
        $('#completeUsersEdit').addClass('no-show');
        return newPassword2;
    }else{
        $('#errorUsersName').removeClass('no-show');
        $('#errorUsersPassword').addClass('no-show');
        $('#completeUsersEdit').addClass('no-show');
    }
};
function validPassword(data){
    if($("#addPasswordUsers").val()!=$("#addPassword2Users").val()){
        $('#errorAddUsersPassword').removeClass('no-show');
        return false;}
}
function editDeviceWriteIdToken(x){
    idDevice=x.split(',')[0];
    tokenDevice=x.split(',')[1];
    $("#idDevise").attr('value',idDevice);
    $("#tokenDevise").attr('value',tokenDevice);
    $("#nameDevise").attr('value',x.split(',')[2]);
    if(tokenDevice=='undefined'){
        $(".tokenDevise").addClass("no-show")
    }else{
        $(".tokenDevise").removeClass("no-show")
    }
    console.log(tokenDevice);
}
function editDevice(){
    var device = {};
    device.id = idDevice;
    device.school = $("#editDeviceCategory").val();
    device.filter2 = $("#editDeviceFilter2").val();
    device.comments = $("#newComment").val();
    if(device.school !=0) {
        $('#editDevice .close').click();
        socket.emit('updateDevice', device);
        $('#errorEditDevice').addClass('no-show');
        $('#completeEditDevice').removeClass('no-show');
    }else{
        $('#errorEditDevice').removeClass('no-show');
        $('#completeEditDevice').addClass('no-show');
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
function getFilter(query,name){
    socket.emit("getFilter",{name:name,params:query})
}
function deployAPK(){
    var apk = {};
    apk.version = $("#selectVersionApkToDeploy").val().split(' ')[0];
    apk.build = $("#selectVersionApkToDeploy").val().split(' ')[1];
    apk.school = $("#selectCategory").val();
    apk.filter = $("#customFilter").val();
    apk.devices = $('input:checkbox.checkboxWarning:checked').map(function() {return this.value;}).get();
    socket.emit("deployApk", apk);
    $("#completeDeployApk").removeClass('no-show').css('display', 'block');
    $("#completeDeployApk").html("The deploy process has been initialized successfully (Type: Kidroid Loader, Version: v"+apk.version+" build "+apk.build+ ")");
    setTimeout(function(){$('#completeDeployApk').fadeOut('fast')},3000);
}
function deployKidroid(){
    var kidroid = {};
    kidroid.version = $("#kidroidVersionDeploy").val().split(' ')[0];
    kidroid.school = $("#selectCategory").val();
    kidroid.filter = $("#customFilter").val();
    kidroid.devices = $('input:checkbox.checkboxWarning:checked').map(function() {return this.value;}).get();
    socket.emit("deployKidroid", kidroid);
    $("#completeDeployKidroid").removeClass('no-show').css('display', 'block');
    $("#completeDeployKidroid").html("The deploy process has been initialized successfully (Type: Kidroid Loader, Version: v"+kidroid.version+ ")");
    setTimeout(function(){$('#completeDeployKidroid').fadeOut('fast')},3000);
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
    device.loader = $("#kidroidVersion").val();
    device.limit = itemsPerPage = $("#ItemsPerPage").val();
    socket.emit('getDevicesByParams', device);
    socket.emit('getDeviceIdByParams', device);
    socket.emit('getDevicesQuantityByParams', device);
    console.log(data);
};
var acrivePage;
function page(i) {
    acrivePage=i;
    var device = {};
    var data = {};
    data.limit = itemsPerPage = $("#ItemsPerPage").val();
    device.sort = sort();
    device.search = data.search = $("#DeviceNameIDSerial").val();
    device.status = data.status = $("#selectStatus").val();
    device.school = data.school = $("#selectCategory").val();
    device.filter2 =data.filter2 =  $("#customFilter").val();
    device.build = data.build = $("#marionetteVersion").val();
    device.loader = $("#kidroidVersion").val();
    if(data.limit==10 || i==1) {
        device.page = data.page = i * 10 - 10;
    }else if(data.limit==20 && i!=1){
        device.page = data.page = i * 20 -20;
    }else if(data.limit==50 && i!=1){
        device.page = data.page = i * 50 -50;
    }
    socket.emit('getDevicesByParams', data);
    socket.emit('getDevicesQuantityByParams', device);
    console.log(device);
};
function addDevice() {
    var device = {};
    device.category = $("#addSelectCategory").val();
    device.build = $("#addSelectVersion").val();
    device.numberDevice = number = $("#amountDevice").val();
    device.filter = $("#filter2").val();
    console.log(device);
    if (device.category != 0 && device.version !=0)  {
        socket.emit('createDevice', device);
        $('#errorAddDevice').addClass('no-show');
        $('#completeAddDevice').removeClass('no-show');
        $('#idDeviceCreate').attr('rows',''+ number + '');

        //console.log('yes');
    } else{
        $('#errorAddDevice').removeClass('no-show');
        $('#completeAddDevice').addClass('no-show');
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
    itemsPerPage = $("#ItemsPerPage").val();
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

function dellUsers(){
    var device ={};
    device.devices = $('input:checkbox.checkAllUsers:checked').map(function() {return this.value;}).get();
    socket.emit('removeUsers', device.devices);
    //console.log(device.devices);
}

//TODO ���������� �� ����������� ������� ��������
function dellFilter(){
    console.log("dellFilter");
    var filter ={};
    filter.filters = $('input:checkbox.checkAllFilters:checked').map(function() {return this.value;}).get();
    filter.name = "Filter2";
    if(filter.filters.length >=1){
        socket.emit('removeFilters', filter);
    }
    //console.log(device.devices);
}
function dellCategory(){
     console.log("dellCategory");
    var category ={};
    category.filters = $('input:checkbox.checkAllCategory:checked').map(function() {return this.value;}).get();
    category.name = "School";
    if(category.filters.length >=1){
        socket.emit('removeFilters', category);
    }
}
function delMarionetteAPK(){
    var device ={};
    device.devices = $('input:checkbox.checkAllMarionetteAPK:checked').map(function() {return this.value;}).get();
    socket.emit('removeMarionetteAPK', device.devices);
    //console.log(device.devices);
}
function delKidroidVersion(){
    var device ={};
    device.devices = $('input:checkbox.checkAllKidroidVersion:checked').map(function() {return this.value;}).get();
    socket.emit('removeKidroidVersion', device.devices)
    //console.log(device.devices);
}
function setDefaultApk(){
    var device = {}
    device.id = $('#selectDefaultApkVersion option:selected').attr('data-id');
    device.version = $('#selectDefaultApkVersion').val();
    device.type = 'APK';
    if(device.version.split(' ')[2]== 'current'){
        console.log('no');
    }else{
        console.log(device);
        socket.emit('makeDefaultVersion', device);
    }

}
function setDefault(){
    var device = {}
    device.id = $('#selectDefaultKidroidVersion option:selected').attr('data-id');
    device.version = $('#selectDefaultKidroidVersion').val();
    device.type = 'Kidroid';
    if(device.version.split(' ')[1]== 'current'){
        console.log('no');
    }else{
        //console.log('yes');
        socket.emit('makeDefaultVersion', device);
    }
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
       $('#closeAddDevice').click();
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
//$(document).ready(function () {
//    <div class="clndr-controls">
//    <div class="clndr-previous-button">&lsaquo;</div>
//    <div class="month"><%= month %></div>
//    <div class="clndr-next-button">&rsaquo;</div>
//    </div>
//}