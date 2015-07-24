/**
 * Created by anton_gorshenin on 25.05.2015.
 */
"use strict";

socket.on('displayData', function (data) {
    //console.log(data.length);
    var html = '';
    console.log(data.length,"displayData");
    if(!data.length){
        //console.log('no');
        html = "<td colspan='7' class='text-center'><h3>Device not found!</h3></td>"
    }else {
        for (var i = 0; i< data.length;i++) {
            //console.log(data);
            var checkbox = "<td><input type='checkbox' class='checkboxWarning' value=" + data[i]._id + "></td>";
            var deviceId = "<td>" + data[i]._id + "</td>";
            var deviceName = "<td>" + data[i].name + "<p>(Android v." + data[i].android + ")</p></td>";
            var update = (!data[i].updateRequired) ? "" : "*Pending update (v" + data[i].apkToUpdate.version + " build " + data[i].apkToUpdate.build + ")";
            var apkVersion = "<td>" + ((!+data[i].apk.build >= 1 ) ? "-" : data[i].apk.version + " (Build " + data[i].apk.build + ")") + "<p>" + update + "</p></td>";
            var loaderVersion = "<td>" + ((data[i].loader != 0) ? data[i].loader : '-') + "</td>";
            var status = "<td>" + data[i].status + "</td>";
            if (data[i].longitude != 0 || data[i].latitude != 0) {
                var map = "<button id='buttonMap' href='#map' data-toggle='modal' class='btn btn-default' onclick='showmap(" + data[i].longitude + "," + data[i].latitude + ")'>Location</button>";
                //console.log('map');
            }
            else {
                var map = "<p></p>"
                //console.log('no-map');
            }
            var edit = "<button href='#editDevice' role='button' class='btn btn-primary' data-toggle='modal' onclick='editDeviceWriteIdToken(\"" + data[i]._id + "," + data[i].token + "," + data[i].name + "\")'>Edit</button> ";
            //var deleteDevice = "<button class='btn btn-danger' type='button' onclick=\'socket.emit(\"removeDevice\",\"" + data[i].deviceId + "\")\')>Delete</button>";
            var options = "<td><div class='btn-group' role='group'>" + map + edit + "</div></td>";
            html += "<tr>" + checkbox + deviceId + deviceName + apkVersion + loaderVersion + status + options + "</tr>";
        }
    }
    $("#deviceTable").html(html);
});
var itemsPerPage;
socket.on('quantity', function (data) {
    //console.log(data);
    var onePage=acrivePage-2;
    var lastPage=acrivePage+2;
    var nextPage=acrivePage+1;
    var prevPage=acrivePage-1;
    //if(acrivePage==1){
    //    $("#prevPage").addClass('no-show');
    //    $("#nextPage").removeClass('no-show');
    //}else if(acrivePage==Page){
    //    $("#nextPage").addClass('no-show');
    //    $("#prevPage").removeClass('no-show');
    //}else{
    //    $("#prevPage").removeClass('no-show');
    //    $("#nextPage").removeClass('no-show');
    //}
    $("h4").html(data + " devices found:");
    $("#deployCount").html(" ("+data+")");
    $("#deployCountKidroid").html(" ("+data+")");
    var html = '';
    var allPage = Math.ceil(data / itemsPerPage);
    if(acrivePage==undefined){
        acrivePage=1;
    }
    if(onePage >= 2 && lastPage<allPage) { // �� ��� �� � ��������
        for (var j = onePage; j <= lastPage; j++)
            if (j == acrivePage) {
                html += "<li class='active'><a onclick='page(" + j + ")'>" + j + "</a></li>"
            } else {
                html += "<li><a onclick='page(" + j + ")'>" + j + "</a></li>"
            }
        ;
    }else if(lastPage>=allPage && onePage>=allPage-5 && onePage>0 && allPage>=5){ // ���� �� � ����� ������� � ������ �������� �� ���� � �����
        for (var j = allPage-4; j <= allPage; j++)
            if (j == acrivePage) {
                html += "<li class='active'><a onclick='page(" + j + ")'>" + j + "</a></li>"
            } else {
                html += "<li><a onclick='page(" + j + ")'>" + j + "</a></li>"
            }
        ;
    }else if(allPage<5){ //������� ����
        for (var j = 1; j <= allPage; j++)
            if (j == acrivePage) {
                html += "<li class='active'><a onclick='page(" + j + ")'>" + j + "</a></li>"
            } else {
                html += "<li><a onclick='page(" + j + ")'>" + j + "</a></li>"
            }
        ;
    }else{ //����� ������� ������ ����� ���� ����
        for (var j = 1; j <= 5; j++)
            if (j == acrivePage) {
                html += "<li class='active'><a onclick='page(" + j + ")'>" + j + "</a></li>"
            }else {
                html += "<li><a onclick='page(" + j + ")'>" + j + "</a></li>"
            }
        ;
    }
    //console.log(acrivePage);
    var prevButton = '<nav><ul class="pagination"><li><a onclick=\'page(1)\' aria-label="Previous"><span aria-hidden="true">...</span></a> </li><li id="prevPage"><a onclick=\'page(' +prevPage+ ')\' aria-label="Previous"><span aria-hidden="true">Previous</span></a> </li>'
    var nextButton = '<li><a onclick=page(' + nextPage + ') aria-label="Next"><span aria-hidden="true">Next</span></a></li><li><a onclick=page('+ allPage +') aria-label="Next"><span aria-hidden="true">...</span></a></li>'
    if(acrivePage==1 && allPage>1 || acrivePage==undefined){
        //console.log(allPage);
        $("#pagination").html('<nav><ul class="pagination">'+html+nextButton);
    }else if(acrivePage==allPage && allPage>1){
        $("#pagination").html(prevButton+html);
    }
    else if(allPage<=1){
        //console.log("sdfsdf");
        $("#pagination").html('');
    }
    else{
        $("#pagination").html(prevButton+html+nextButton);
    }
    if (data === 0){
        document.getElementById('deployApk').querySelector('a').setAttribute('disabled','disabled');
        document.getElementById('deployKidroid').querySelector('a').setAttribute('disabled','disabled');
    }else{
        document.getElementById('deployApk').querySelector('a').removeAttribute('disabled');
        document.getElementById('deployKidroid').querySelector('a').removeAttribute('disabled');}
});

socket.on('category', function (date) {
    //console.log(date, "category");
    var  html = '<option value="" style="color:#cccccc">- Select school -</option>';
    for (var i = 0; i < date.length; i++) {
        html += "<option>" + date[i].name + "</option>";
    }
    $("#addSelectCategory, #editDeviceCategory, #scheduleDeviceCategory, #selectCategoryPlanning").html(html);
});

socket.on('version', function (date) {
    //console.log(date,"kidroidVersion");
    var html = '<option value="0" style="color:#cccccc">- Kidroid Loader version -</option>';
    if(date.kidroid.length) {
        for (var i = 0; i < date.kidroid.length; i++) {
            html += "<option>" + date.kidroid[i].loader + "</option>";
        }
    }
    $("#kidroidVersion,#kidroidVersionDeploy,#selectDefaultKidroidVersion").html(html);
});

socket.on('version', function (date) {
    //console.log(school,"category");
    var scheduled = '<option value="Install scheduled" >- Install scheduled -</option>';
    var inProgress = '<option value="Install in progress">- Install in progress -</option>';
    var html = '<option value="" style="color:#cccccc">- Marionette version -</option>' + scheduled + inProgress;
    for (var i = 0; i < date.apk.length; i++) {
        html += "<option>" + date.apk[i].apk.version +" "+ date.apk[i].apk.build +"</option>";
    }
    $("#marionetteVersion").html(html);
});
socket.on('version', function (date) {
    //console.log(school,"category");
    var html = '';
    for (var i = 0; i < date.length; i++) {
        html += "<tr><td>" + date[i].apk.version + "</td><td>" + date[i].apk.build + "</td><td><button class='btn btn-danger' type='button' onclick=\'socket.emit(\"removeVersion\",\"" + date[i]._id + "\")\')>Delete</button>";
    }
    $("#versionTable").html(html);
});
//socket.on('status', function (date) {
//    //console.log(school,"category");
//    var html = '<option value="" style="color:#cccccc">- Select status -</option>';
//    for (var i = 0; i < date.length; i++) {
//        html += "<option>" +date[i]+"</option>";
//    }
//    $("#selectStatus").html(html);
//});

socket.on('users', function (data) {
    if(data==0){
        $('#userTable').html('Users not found')
    }else
    //console.log(data);
    var html = '';
    for (var i in data){
        var checkbox = "<td><input type='checkbox' id='checkAllUsers" + data[i]._id + "' class='checkAllUsers' value='" + data[i]._id + "'></td>";
        var name = "<td>" + data[i].local.name + "</td>";
        var editName = "<td><div class='btn-group'><a href='#editUsers' type='reset' form='editUserForm' role='button' class='btn btn-primary' data-toggle='modal' onclick='editUsers(\"" + data[i]._id +" , " +data[i].local.name + "\")'>Edit user</a>";
        html += "<tr>"+checkbox+name+editName+"</tr>";}
    $("#userTable").html(html);
});

socket.on('allDeviceCreated', function (data) {
    if (data._id){
        $('#idDevice').addClass('in')
            .attr('aria-hidden', false)
            .css('z-index','1050')
            .css('opacity','1')
            .css('display','block');
        $('#addDevice').css('display','none');
        $("#idDeviceCreate").append(data._id+"\n");
        //TODO ������� ����� ���������� ����������� ���������
        $("#numberIdDevice").replaceWith( "Devices has been added successfully" );
    }
    //$(".idTextarea textarea, .idTextarea textarea p").css({"display":"block"})

});

socket.on('error', function (date) {
    console.log(date,"error");
});

socket.on('deviceScheduled', function (data) {
    console.log(data);
    var html = '';
    if(!_.isNull(data)) {
        for (var i = 0; i < data.length; i++) {
            var checkbox = "<td><input type='checkbox' class='checkSchedule' id='checkSchedule" + data[i]._id + "'  value='" + data[i]._id + "'></td>"
            var id = "<td>" + data[i]._id + "</td>"
            var school = "<td>" + data[i].school + "</td>"
            var apk_vers = "<td>" + data[i].apk.version + "</td>"
            html += "<tr>" + checkbox + id + school + apk_vers + "<td></td><td></td></tr>";
        }
    }
    $("#tableSchedule").html(html);
});
socket.on('deviceForDeploy', function (data) {
    var  html = '';
    if(!_.isNull(data)) {
        for (var i = 0; i < data.length; i++) {
            var checkbox = "<td><input type='checkbox' class='checkSchedule' id='checkSchedule" + data[i]._id + "'  value='" + data[i]._id + "'></td>"
            var id = "<td>" + data[i]._id + "</td>"
            var school = "<td>" + data[i].school + "</td>"
            var apk_vers = "<td>" + data[i].apk.version + "</td>"
            html += "<tr>" + checkbox + id + school + apk_vers + "<td></td><td></td></tr>";
        }
    }
    $("#tableSchedule").html(html);
});

socket.on('filters', function (data) {

    for (var i in data) {
        //console.log("filters",data);
        var html = '';
        if (data[i].name === "School") {
            $("#firstFilter").html(data[i].name);
            for (var j = 0; j < data[i].params.length; j++) {
                var name = "<td>" + data[i].params[j] + "</td>"
                //console.log(data[i].params[j]);
                var editButton = "<td><a href='#editFilters' type='reset' form='editCategoryForm' role='button' class='btn btn-primary' data-toggle='modal' onclick='editFilters(\"" + data[i].params[j] + "\")\'>Edit</a></td>";
                var checkbox = "<td><input type='checkbox' class='checkAllCategory' id='checkSchedule'  value='"+ data[i].params[j] +"'></td>"
                html += "<tr>" + checkbox + name + editButton + "</tr>";
            }
            $("#tableFilter").html(html);
        }
        if (data[i].name === "Filter2") {
            html = '';
            $("#secondFilter").html(data[i].name);
            for (var f = 0; f < data[i].params.length; f++) {
                var name = "<td>" + data[i].params[f] + "</td>"
                var editButton = "<td><a href='#editFilters' type='reset' form='editCategoryForm' role='button' class='btn btn-primary' data-toggle='modal' onclick='editFilters(\"" + data[i].params[f] + "\")'>Edit</a></td>";
                var checkbox = "<td><input type='checkbox' class='checkAllFilters' id='checkSchedule'  value='" + data[i].params[f] + "'></td>"
                html += "<tr>" + checkbox + name + editButton + "</tr>";
            }
            $("#filtersTable").html(html);
        }
    }
});

socket.on('allSchedule', function (data) {
    if(data==0){
        $('#allSchedule').html('request not found')
    }else {
        //console.log(data)
        var options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            hour: 'numeric',
            hour12: false,
            minute: 'numeric',
            second: 'numeric'
        };
        var html = '';
        for (var i in data) {
            var date = new Date(data[i].timeStart);
            var name = data[i].name;
            var version = "v" + data[i].versionToUpdate.version + " build " + data[i].versionToUpdate.build;
            var total = data[i].deviceToUpdate;
            var updated = data[i].deviceUpdated;
            var school = (data[i].school == "") ? "-" : data[i].school;
            var filter = (data[i].filter == "") ? "-" : data[i].filter;
            var type = data[i].type;
            html += "<tr><td>" + date.toLocaleString("en", options) + " (" + name + ")" + "</td><td>" + type + "</td><td>" + version + "</td><td>" + total + "</td><td>" + updated + "</td><td>" + school + "</td><td>" + filter + "</td></tr>";
            $("#allSchedule").html(html);
        }
    }
});
socket.on('userName', function (data){
    $("#userName").html(' Signed in as: ' +data);
});

socket.on('getVersionDeploy', function (data) {
    var html = '<option value="0" style="color:#cccccc">- Kidroid version -</option>';
    if(data.kidroid.length !=0) {
        var defaultVersion;
        if (data.kidroid.length) {
            for (var i = 0; i < data.kidroid.length; i++) {
                if (data.kidroid[i].default) {
                    defaultVersion = data.kidroid[i];
                }
            }

        }
        //console.log(data.kidroid.length);
        if (defaultVersion != undefined) {
            html = "<option data-id='" + defaultVersion._id + "'>" + defaultVersion.loader + " (current)" + "</option>";
        }
        for (var j = 0; j < data.kidroid.length; j++) {
            if (data.kidroid[j] != defaultVersion)
                html += "<option data-id='" + data.kidroid[j]._id + "'>" + data.kidroid[j].loader + "</option>";
        }
    }
    $("#selectDefaultKidroidVersion, #kidroidVersionDeploy, #addSelectVersionKidroid ").html(html);
});

socket.on('getVersionDeploy', function (data) {
    var html = '<option value="0" style="color:#cccccc">- Marionette version -</option>';
    if(data.apk.length !=0) {

        var defaultVersion;
        for (var i = 0; i < data.apk.length; i++) {
            if (data.apk[i].default) {
                defaultVersion = data.apk[i];
            }
        }
        if (defaultVersion != undefined) {
            html = "<option data-id='" + defaultVersion._id + "'>" + defaultVersion.apk.version + " " + defaultVersion.apk.build + " (current)" + "</option>";
        }
            for (var j = 0; j < data.apk.length; j++) {
                if (data.apk[j] != defaultVersion)
                    html += "<option data-id='" + data.apk[j]._id + "'>" + data.apk[j].apk.version + " " + data.apk[j].apk.build + "</option>";
            }
    }
    $("#selectDefaultApkVersion, #addSelectVersion, #selectVersionToDeploy, #scheduleDeviceVersionFilter").html(html);
});
socket.on('getVersionDeploy', function (data) {
    var apk = "";
    var kidroid = "";
    var options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: 'numeric',
        hour12: false,
        minute: 'numeric',
        second: 'numeric'
    };
    if(data.apk.length){
        for (var i = 0; i < data.apk.length; i++) {
            var dateApk = new Date(data.apk[i].date);
            var checkBox = "<td ><input type='checkbox' class='checkAllMarionetteAPK' value=" + data.apk[i]._id + "></td>";
            var name = '<td class="name">'+ dateApk.toLocaleString("en", options) + ' (' + data.apk[i].user + ')</td>';
            var version = '<td class="version">'+ data.apk[i].apk.version + '</td>';
            var build = '<td class="build">'+  data.apk[i].apk.build + '</td>';
            apk += '<tr>'+checkBox+name+version+build+'</tr>';
        }
    }
    $("#settingApkVersionTable").html(apk);
    if(data.kidroid.length) {
        for (var j = 0; j < data.kidroid.length; j++) {
            var dateKidroid = new Date(data.kidroid[j].date);
            var checkBoxKid = "<td ><input type=checkbox class='checkAllKidroidVersion' value=" + data.kidroid[j]._id + "></td>";
            var nameKid = '<td class="name">' + dateKidroid.toLocaleString("en", options) + ' (' + data.kidroid[j].user + ')</td>';
            var versionKid = '<td class="version">' + data.kidroid[j].loader + '</td>';
            var optionsdKid = '<td class="build"></td>';
            kidroid += '<tr>' + checkBoxKid + nameKid + versionKid + '</tr>';
        }
    }
    //console.log(kidroid);
    $("#settingKidroidVersionTable").html(kidroid);
});

//Filters

function getFilter(query,name){
    query.nextSibling.setAttribute('id','Filter');
    socket.emit("getFilter",{name:name,params:query.value})
}

function FilterArray() {
    var array =  [];
    return {
        pushData:function(data){
            array.push(data)
        },
        getArray:function(){
            return  array
        },
        resetArray: function(){
            array = [];
        }
    }
};

var setFilterArray = new FilterArray();

function startAutoComplete(array){
    var filterFieldId =  document.getElementById('Filter');

    filterFieldId.innerHTML = '';

    var counter = (array.length <= 5)?array.length:5;

    for(var i=0; i < counter; i++){
        filterFieldId.insertAdjacentHTML('beforeend','<div class="col-xs-12 autocomplete">'+array[i]+'</div>')
    }

    filterFieldId.addEventListener('click',function(event){
        filterFieldId.previousSibling.value =  event.target.innerHTML;
        find();
        filterFieldId.innerHTML = '';

    });
    document.addEventListener('click',function(event){
        filterFieldId.innerHTML = '';
        filterFieldId.setAttribute('id','')
    });
    setFilterArray.resetArray()
}

socket.on("getFilterBack",function(filters){
        for (var i in filters){
            setFilterArray.pushData(filters[i].params);
        }
        startAutoComplete(setFilterArray.getArray())
});

socket.on("FirewallList",function(Lists){

    var blackList = document.getElementById('blackList');
    var whiteList = document.getElementById('whiteList');
    blackList.innerHTML="";
    whiteList.innerHTML="";

    Lists[0].blackList.forEach(function(item){
        var blackListTr = document.createElement('tr');
        blackListTr.innerHTML = "<td><input type='checkbox' data-value="+item+"></td><td>"+item+"</td>";
        blackList.appendChild(blackListTr);
    });

    Lists[0].whiteList.forEach(function(item){
        var whiteListTr = document.createElement('tr');
        whiteListTr.innerHTML = "<td><input type='checkbox' data-value="+item+"></td><td>"+item+"</td>";
        whiteList.appendChild(whiteListTr);
    });

    switch(Lists[0].access){
        case "white":
            console.log("true",Lists[0].access);
            document.querySelector('input[data-name="white"]').setAttribute('checked','checked');
            break;
        case "black":
            console.log("false",Lists[0].access);
            document.querySelector('input[data-name="black"]').setAttribute('checked','checked');
            break;
        case "all":
            console.log("null",Lists[0].access);
            document.querySelector('input[data-name="all"]').setAttribute('checked','checked');
            break;
        default:
            throw new Error("FirewallList undefined case");
    }
});