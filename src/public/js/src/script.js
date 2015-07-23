/**
 * Created by nikolay_ivanisenko on 25.05.2015.
 */

"use strict";

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
    var nameCategory = document.getElementById('newCategory').value;
    if(nameCategory !=0){
        //console.log('yes');
        socket.emit('createFilter', {"name":"School","params": nameCategory });
        $('#errorCreateSchool').css('display','none');
        $('#completeCreateSchool').css('display','block');
        $('#completeCreateSchool').html('The category '+nameCategory+  ' has been added successful');
        document.getElementById('newCategory').value = '';
        setTimeout(function(){$('#completeCreateSchool').fadeOut('fast')},3000);
    }else{
        //console.log('no');
        $('#errorCreateSchool').css('display','block');
        $('#completeCreateSchool').css('display','none');
    }

    //console.log(nameCategory);
};

function createNewFilter() {
    var nameFilter = $("#paramFilter").val();
    if(nameFilter !=0){
        socket.emit('createFilter', {"name":"Filter2","params": nameFilter });
        $('#errorCreateFilter').css('display','none');
        $('#completeCreateFilter').css('display','block');
        $('#completeCreateFilter').html('The filter '+nameFilter+  ' has been added successful');
        document.getElementById('paramFilter').value = '';
        setTimeout(function(){$('#completeCreateFilter').fadeOut('fast')},3000);
    }else{
        console.log('no');
        $('#errorCreateFilter').css('display','block');
        $('#completeCreateFilter').css('display','none');
    };
};
//TODO =====================
var idDevice;
var tokenDevice;
var newUsersId;
var oldNameUser;

function editFilters(context) {
    //$("#newNameCategory").val(context.parentNode.parentNode.childNodes[1].innerText).attr("data-name",context.parentNode.parentNode.childNodes[1].innerText);
    //$("#newNameCategory").attr("data-name",context).attr("value",context).attr("placeholder",context);
    var elem = document.getElementById('newNameCategory');
    elem.setAttribute("data-name",context);
    elem.value= context;
    //console.log(context);
};
function editUsers(x) {
    newUsersId= x.split(' ')[0];
    $('#newNameUsers').attr("value",x.split(' ')[2]);
    oldNameUser=x.split(' ')[2];
    $('.form-horizontal').trigger( 'reset' )
};

function inputNewNameCategory() {
    var device = {};
    //device.oldName = $("#newNameCategory").attr("data-name");
    device.oldName = document.getElementById('newNameCategory').getAttribute('data-name');
    device.newName = $("#newNameCategory").val();
    if(device.newName != 0 && device.newName!=device.oldName) {
        //console.log('yes');
        $('#errorEditFilters').css('display','none');
        $('#completeEditFilters').css('display','block');
        socket.emit('editCategory', device);
        $("#completeEditFilters").html('The category '+device.newName+ ' has been saved successfully')
        setTimeout(function(){$('#completeEditFilters').fadeOut('fast')},3000);
    }else if(device.newName==device.oldName){
        $('#errorEditFilters').css('display','block');
        $('#completeEditFilters').css('display','none');
        $("#errorEditFilters").html('not a change of name')
        setTimeout(function(){$('#errorEditFilters').fadeOut('fast')},3000);
    }
    else{
        //console.log('no');
        $('#errorEditFilters').css('display','block');
        $('#completeEditFilters').css('display','none');
        $("#errorEditFilters").html('Not all fields required')
        setTimeout(function(){$('#errorEditFilters').fadeOut('fast')},3000);
    }
    //console.log(device);
};
function inputNewNameUser() {
    var device = {};
    device.id = newUsersId;
    device.newName = $("#newNameUsers").val();
    device.newPassword = $("#newNamepassword").val();
    var newPassword2 = $("#newNamepassword2").val();
    if(device.newPassword == newPassword2 && device.newName!=0){
        console.log(oldNameUser);
        $('#errorUsersPassword').css('display','none');
        $('#errorUsersName').css('display','none');
        $('#completeUsersEdit').css('display','block');
        if(oldNameUser!=device.newName && newPassword2==0){
            $('#completeUsersEdit').html('name changed');
            oldNameUser=device.newName;
            setTimeout(function(){$('#completeUsersEdit').fadeOut('fast')},3000);
        }
        else if(oldNameUser!=device.newName && newPassword2!=0){
            $('#completeUsersEdit').html('name and password changed');
            oldNameUser=device.newName;
            setTimeout(function(){$('#completeUsersEdit').fadeOut('fast')},3000);
        }
        else if((oldNameUser==device.newName && newPassword2==0)){
            $('#completeUsersEdit').html('field is not changed');
            setTimeout(function(){$('#completeUsersEdit').fadeOut('fast')},3000);
        }else
        {
            $('#completeUsersEdit').html('password changed');
            setTimeout(function(){$('#completeUsersEdit').fadeOut('fast')},3000);
        }
        //$('.close').click();
        return socket.emit('updateUser', device);
        setTimeout(function(){$('#completeUsersEdit').fadeOut('fast')},3000);
    }if(device.newPassword != newPassword2 ){
        $('#errorUsersPassword').css('display','block');
        $('#errorUsersName').css('display','none');
        $('#completeUsersEdit').css('display','none');
        setTimeout(function(){$('#errorUsersPassword').fadeOut('fast')},3000);
        return newPassword2;

    }else{
        $('#errorUsersName').css('display','block');
        $('#errorUsersPassword').css('display','none');
        $('#completeUsersEdit').css('display','none');
        setTimeout(function(){$('#errorUsersName').fadeOut('fast')},3000);
    }
};
function validPassword(data){
    if($("#addPasswordUsers").val()!=$("#addPassword2Users").val()){
        $('#errorAddUsersPassword').css('display','block');
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
        $('#errorEditDevice').css('display','none');
        $('#completeEditDevice').css('display','block');
    }else{
        $('#errorEditDevice').css('display','block');
        $('#completeEditDevice').css('display','none');
    }
    //console.log(device);
}
function sort(place) {
    var params = {};
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
    var apk = {};
    apk.version = $("#selectVersionApkToDeploy").val().split(' ')[0];
    console.log(apk.version);
    apk.build = $("#selectVersionApkToDeploy").val().split(' ')[1];
    apk.school = $("#selectCategory").val();
    apk.filter = $("#customFilter").val();
    apk.devices = $('input:checkbox.checkboxWarning:checked').map(function() {return this.value;}).get();
    if(apk.version==0){
        $("#errorDeployApk").css('display','block').css('display', 'block');
        $("#errorDeployApk").html("select version APK");
        setTimeout(function () {
            $('#errorDeployApk').fadeOut('fast')
        }, 3000);
    }else {
        //socket.emit("deployApk", apk);
        $("#completeDeployApk").css('display','block').css('display', 'block');
        $("#completeDeployApk").html("The deploy process has been initialized successfully (Type: Kidroid Loader, Version: v" + apk.version + " build " + apk.build + ")");
        setTimeout(function () {
            $('#completeDeployApk').fadeOut('fast')
        }, 3000);
    }
}
function deployKidroid(){
    var kidroid = {};
    kidroid.version = $("#kidroidVersionDeploy").val().split(' ')[0];
    kidroid.school = $("#selectCategory").val();
    kidroid.filter = $("#customFilter").val();
    kidroid.devices = $('input:checkbox.checkboxWarning:checked').map(function() {return this.value;}).get();
    if(kidroid.version==0){
        $("#errorDeployKidroid").css('display','block').css('display', 'block');
        $("#errorDeployKidroid").html("select version Kidroid");
        setTimeout(function(){$('#errorDeployKidroid').fadeOut('fast')},3000);
    }else {
        socket.emit("deployKidroid", kidroid);
        $("#completeDeployKidroid").css('display','block').css('display', 'block');
        $("#completeDeployKidroid").html("The deploy process has been initialized successfully (Type: Kidroid Loader, Version: v" + kidroid.version + ")");
        setTimeout(function () {
            $('#completeDeployKidroid').fadeOut('fast')
        }, 3000);
    }
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
    console.log(device,"find");
    socket.emit('getDevicesByParams', device);
    socket.emit('getDeviceIdByParams', device);
    socket.emit('getDevicesQuantityByParams', device);
};
var acrivePage;
function page(i) {
    acrivePage=i;
    var device = {};
    device.limit = itemsPerPage = $("#ItemsPerPage").val();
    device.sort = sort();
    device.search =  $("#DeviceNameIDSerial").val();
    device.status =  $("#selectStatus").val();
    device.school =  $("#selectCategory").val();
    device.filter2 = $("#customFilter").val();
    device.build =  $("#marionetteVersion").val();
    device.loader = $("#kidroidVersion").val();
    if(device.limit==10 || i==1) {
        device.page =  i * 10 - 10;
    }else if(device.limit==20 && i!=1){
        device.page =  i * 20 -20;
    }else if(device.limit==50 && i!=1){
        device.page =  i * 50 -50;
    }
    socket.emit('getDevicesByParams', device);
    socket.emit('getDevicesQuantityByParams', device);
    //console.log(device);
};
function addDevice( ) {
    var device = {};
    device.category = $("#addSelectCategory").val();
    device.build = $("#addSelectVersion").val();
    device.kidroidBuild = $("#addSelectVersionKidroid").val();
    device.numberDevice = $("#amountDevice").val();
    device.filter = $("#filter2").val();
    if (device.category != 0 && device.build !=0 && device.kidroidBuild !=0)  {
        socket.emit('createDevice', device);
        console.log(device);
        $('#errorAddDevice').css('display','none');
        $('#completeAddDevice').css('display','block');
        $('#idDeviceCreate').attr('rows',''+ device.numberDevice + '');
        setTimeout(function(){$('#completeAddDevice').fadeOut('fast')},3000);
    } else{
        $('#errorAddDevice').css('display','block');
        $('#completeAddDevice').css('display','none');
        setTimeout(function(){$('#errorAddDevice').fadeOut('fast')},3000);
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
        $('#errorAddSchedule').css('display','block');

    }
    else {
        socket.emit('createSchedule', device)
        $('#editSchedule').removeClass('.in')
            .attr('aria-hidden', true)
            .css('z-index','-1')
            .css('opacity','0')
            .css('display','none');
        $('#errorAddSchedule').css('display','none');
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
//Firewall rules
var firewallRules = {
    getLists: function(){
        return this.emitChanges("getAllFirewallList");
    },
    saveAccess: function(e){
        var state = document.getElementById('state').querySelectorAll('input[type="radio"]');
        [].forEach.call(state,function(item){
            if (item.checked) {
                //console.log(item.getAttribute('data-name'))
                firewallRules.emitChanges.call(this,"saveAccessState",item.getAttribute('data-name'));
            }
        });
    },
    addBlackList: function(e){
        if(e)e.preventDefault();
        var ipBlack = document.getElementById('addIpToBlackList').value;
        if (this.validateIP("addBlackList",ipBlack)){
            this.emitChanges.call(this,"addBlackList",ipBlack)
        }
    },
    addWhiteList: function(e){
        if(e)e.preventDefault();
        var ipWhite = document.getElementById('addIpToWhiteList').value;
        if (this.validateIP("addWhiteList",ipWhite)){
            this.emitChanges.call(this,"addWhiteList",ipWhite)
        }
    },
    validateIP: function(element,inputText){
        var allertMessage = document.createElement('p');
        var ipFormat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if(inputText.match(ipFormat))
        {
            document.getElementById(element).querySelector(".alert-success").style.display = 'block';
            document.getElementById(element).querySelector(".alert-danger").style.display = '';
            return true;
        }
        else
        {
            document.getElementById(element).querySelector(".alert-success").style.display = '';
            document.getElementById(element).querySelector(".alert-danger").style.display = 'block';
            return false;
        }
    } ,
    removeFromList: function(element){
        var IP = document.getElementById(element).querySelectorAll('input[type="checkbox"]:checked');

        [].forEach.call(IP,function(item){
            firewallRules.emitChanges.call(this,"removeIP",item.getAttribute('data-value'));
        });
    },
    emitChanges: function(emitName,params){
        socket.emit(emitName, params, function(err,message){
            if (err) throw new Error(err);
            if (message.text === "IP already in list"){
                alert(message.text)
            }else
                firewallRules.getLists();
                firewallRules.emitChanges("saveFile",null)
        });
    }
};
$(document).ready(function () {
    $('#closeScheduleModal, #closeScheduleModal1').click(function(){
        $('#editSchedule').removeClass('.in')
            .attr('aria-hidden', true)
            .css('z-index','-1')
            .css('opacity','0')
            .css('display','none');
    });
});
$(document).ready(function () {
    $('#closeIdTextarea1, #closeIdTextarea').click(function () {
        $('#addDevice').css('display', 'block');
        $('#idDevice').removeClass('.in')
            .attr('aria-hidden', true)
            .css('z-index', '-1')
            .css('opacity', '0')
            .css('display', 'none');

    });
});
