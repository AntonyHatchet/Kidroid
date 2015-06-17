/**
 * Created by anton_gorshenin on 25.05.2015.
 */

socket.on('displayData', function (data) {
    //console.log(data.length);
    html = '';
    for (i in data){
        var checkbox = "<td><input type='checkbox' class='checkboxWarning' value="+ data[i]._id +"></td>";
        var deviceId = "<td>" + data[i]._id + "</td>";
        var deviceName = "<td>"+ data[i].name + "<p>(Android v." +data[i].android +")</p></td>";
        var update = (!data[i].updateRequired)? "": "*Pending update (v"+data[i].apkToUpdate.version+" build "+data[i].apkToUpdate.build+")";
        var apkVersion = "<td>" + ((!+data[i].apk.build >=1 )? "-" : data[i].apk.version +" (Build "+data[i].apk.build + ")") + "<p>"+ update +"</p></td>";
        var loaderVersion = "<td>"+ ((data[i].loader >= 1)? data[i].loader: '-') +"</td>";
        var status = "<td>" + data[i].status + "</td>";
        if(data[i].longitude!=0||data[i].latitude!=0) {
            var map = "<button id='buttonMap' href='#map' data-toggle='modal' class='btn btn-default' onclick='showmap(" + data[i].longitude + "," + data[i].latitude + ")'>Location</button>";
            //console.log('map');
        }
        else{
            var map ="<p></p>"
            //console.log('no-map');
        }
        var edit = "<button href='#editDevice' role='button' class='btn btn-primary' data-toggle='modal' onclick='editDeviceWriteIdToken(" + data[i]._id +")'>Edit</button> ";
        //var deleteDevice = "<button class='btn btn-danger' type='button' onclick=\'socket.emit(\"removeDevice\",\"" + data[i].deviceId + "\")\')>Delete</button>";
        var options = "<td><div class='btn-group' role='group'>" + map + edit + "</div></td>";
        html += "<tr>" +checkbox+deviceId+deviceName+apkVersion+loaderVersion+status+options+ "</tr>";
    }
    $("#deviceTable").html(html);
});
var itemsPerPage;
socket.on('quantity', function (data) {
    //console.log(data);
    var onePage=acrivePage-2;
    var lastPage=acrivePage+2;
    $("h4").html(data + " devices found:");
    $("#deployCount").html(" ("+data+")");
    $("#deployCountKidroid").html(" ("+data+")");
    html = '<nav><ul class="pagination"><li><a onclick=\'page(1)\' aria-label="Previous"><span aria-hidden="true">&laquo;</span></a> </li>';
    Page = Math.ceil(data / itemsPerPage);
    if(onePage >= 2 && lastPage<Page) { // мы гдек то в середине
        for (var j = onePage; j <= lastPage; j++)
            if (j == acrivePage) {
                html += "<li class='active'><a onclick='page(" + j + ")'>" + j + "</a></li>"
            } else {
                html += "<li><a onclick='page(" + j + ")'>" + j + "</a></li>"
            }
        ;
    }else if(lastPage>=Page && onePage>=Page-5 && onePage>0 && Page>=5){ // если мы в конце страниц и перывая страница не ушла в минус
        for (var j = Page-4; j <= Page; j++)
            if (j == acrivePage) {
                html += "<li class='active'><a onclick='page(" + j + ")'>" + j + "</a></li>"
            } else {
                html += "<li><a onclick='page(" + j + ")'>" + j + "</a></li>"
            }
        ;
    }else if(Page<5){ //страниц мало
        for (var j = 1; j <= Page; j++)
            if (j == acrivePage) {
                html += "<li class='active'><a onclick='page(" + j + ")'>" + j + "</a></li>"
            } else {
                html += "<li><a onclick='page(" + j + ")'>" + j + "</a></li>"
            }
        ;
    }else{ //Юнный падаван только начал свой путь
        for (var j = 1; j <= 5; j++)
            if (j == acrivePage) {
                html += "<li class='active'><a onclick='page(" + j + ")'>" + j + "</a></li>"
            } else {
                html += "<li><a onclick='page(" + j + ")'>" + j + "</a></li>"
            }
        ;
    }
    $("#pagination").html(html+ '<li><a onclick=page('+ Page +') aria-label="Next"><span aria-hidden="true">&raquo;</span></a></li>');
});

socket.on('category', function (date) {
    //console.log(date, "category");
    html = '<option value="" style="color:#cccccc">- Select school -</option>';
    for (var i = 0; i < date.length; i++) {
        html += "<option>" + date[i].name + "</option>";
    }
    $("#addSelectCategory, #editDeviceCategory, #scheduleDeviceCategory").html(html);
});

socket.on('version', function (date) {
    //console.log(date,"kidroidVersion");
    html = '<option value="" style="color:#cccccc">- Kidroid Loader version -</option>';
    for (var i = 0; i < date.kidroid.length; i++) {
        html += "<option>" + date.kidroid[i].loader +"</option>";
    }
    $("#kidroidVersion,#kidroidVersionDeploy").html(html);
});

socket.on('version', function (date) {
    //console.log(school,"category");
    var scheduled = '<option value="Install scheduled" >- Install scheduled -</option>';
    var inProgress = '<option value="Install in progress">- Install in progress -</option>';
    html = '<option value="" style="color:#cccccc">- Marionette version -</option>' + scheduled + inProgress;
    for (var i = 0; i < date.apk.length; i++) {
        html += "<option>" + date.apk[i].apk.version +" "+ date.apk[i].apk.build +"</option>";
    }
    $("#marionetteVersion,#selectVersionToDeploy, #editDeviceVersion, #scheduleDeviceVersion, #scheduleDeviceVersionFilter").html(html);
});
socket.on('version', function (date) {
    //console.log(school,"category");
    html = '';
    for (var i = 0; i < date.length; i++) {
        html += "<tr><td>" + date[i].apk.version + "</td><td>" + date[i].apk.build + "</td><td><button class='btn btn-danger' type='button' onclick=\'socket.emit(\"removeVersion\",\"" + date[i]._id + "\")\')>Delete</button>";
    }
    $("#versionTable").html(html);
});
socket.on('status', function (date) {
    //console.log(school,"category");
    html = '<option value="" style="color:#cccccc">- Select status -</option>';
    for (var i = 0; i < date.length; i++) {
        html += "<option>" +date[i]+"</option>";
    }
    $("#selectStatus").html(html);
});

socket.on('users', function (data) {
    //console.log(data);
    html = '';
    for (i in data){
        var checkbox = "<td><input type='checkbox' id='checkAllUsers" + data[i]._id + "' class='checkAllUsers' value='" + data[i]._id + "'></td>";
        var name = "<td>" + data[i].local.name + "</td>";
        var editName = "<td><div class='btn-group'><a href='#editUsers' role='button' class='btn btn-primary' data-toggle='modal' onclick='editUsers(\"" + data[i]._id +" , " +data[i].local.name + "\")'>Edit user</a>";
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
        $("#idDeviceCreate").append("ID " +data._id+"\n")
        //TODO сделать вывод созданного колличества устройств
        $("#numberIdDevice").replaceWith( "Devices has been added successfully" );
    }
    $(".idTextarea textarea, .idTextarea textarea p").css({"display":"block"})

});

socket.on('error', function (date) {
    console.log(date,"error");
});

socket.on('deviceScheduled', function (data) {
    console.log(data);
    html = '';
    for (i in data)
        var checkbox = "<td><input type='checkbox' class='checkSchedule' id='checkSchedule" + data[i]._id + "'  value='" + data[i]._id + "'></td>"
        var id = "<td>" + data[i]._id + "</td>"
        var school = "<td>" + data[i].school + "</td>"
        var apk_vers = "<td>" + data[i].apk.version + "</td>"
        html += "<tr>"+checkbox+id+school+apk_vers+ "<td></td><td></td></tr>";
    $("#tableSchedule").html(html);
});
socket.on('deviceForDeploy', function (data) {
    console.log(data);
    html = '';
    for (i in data)
        var checkbox = "<td><input type='checkbox' class='checkSchedule' id='checkSchedule" + data[i]._id + "'  value='" + data[i]._id + "'></td>"
        var id = "<td>" + data[i]._id + "</td>"
        var school = "<td>" + data[i].school + "</td>"
        var apk_vers = "<td>" + data[i].apk.version + "</td>"
        html += "<tr>"+checkbox+id+school+apk_vers+"<td></td><td></td></tr>";
    $("#tableSchedule").html(html);
});

socket.on('filters', function (data) {
    console.log(data);
    for (i in data) {
        html = '';
        if (data[i].name === "School") {
            $("#firstFilter").html(data[i].name);
            for (var j = 0; j < data[i].params.length; j++) {
                school.pushData(data[i].params[j]);
                var name = "<td>" + data[i].params[j] + "</td>"
                var editButton = "<td><a href='#editFilters' role='button' class='btn btn-primary' data-toggle='modal' onclick='editFilters(this)'>Edit</a></td>";
                var checkbox = "<td><input type='checkbox' class='checkAllCategory' id='checkSchedule'  value='"+ data[i].params[j] +"'></td>"
                html += "<tr>" + checkbox + name + editButton + "</tr>";
            }
            startAutoComplete(school.getArray(),".category");
            $("#tableFilter").html(html);
        }
        if (data[i].name === "Filter2") {
            html = '';
            $("#secondFilter").html(data[i].name);
            for (var f = 0; f < data[i].params.length; f++) {
                filter2.pushData(data[i].params[f]);
                var name = "<td>" + data[i].params[f] + "</td>"
                var editButton = "<td><a href='#editFilters' role='button' class='btn btn-primary' data-toggle='modal' onclick='editFilters(this)'>Edit</a></td>";
                var checkbox = "<td><input type='checkbox' class='checkAllFilters' id='checkSchedule'  value='"+ data[i].params[f] +"'></td>"
                html += "<tr>" + checkbox + name + editButton + "</tr>";
            }
            startAutoComplete(filter2.getArray(),".filter2");
            $("#filtersTable").html(html);
        }
    }
});

socket.on('allSchedule', function (data) {
    console.log(data)
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
    html = '';
    for (i in data) {
        var date = new Date(data[i].timeStart);
        var name = data[i].name;
        var version = data[i].versionToUpdate;
        var status = data[i].status;
        var school = "School #2";
        var type = data[i].type;
        var filter2 = "Some filter data";
        html += "<tr><td>" + date.toLocaleString("en", options) + " (" + name + ")" + "</td><td>" + version + "</td><td>" + status + "</td><td>" + school + "</td><td>" + type + "</td><td>" + filter2 + "</td></tr>";
        $("#allSchedule").html(html);
    }
});
socket.on('userName', function (data){
    $("#userName").html(' Signed in as: ' +data);
});

socket.on('getVersionDeploy', function (data) {
    var defaultVersion;
    for (var i = 0; i < data.kidroid.length; i++) {
        if (data.kidroid[i].default){
            defaultVersion = data.kidroid[i];
        }
    }
    html = "<option>" + defaultVersion.loader +" current"+"</option>";
    for (var j = 0; j < data.kidroid.length; j++) {
        if (data.kidroid[j] != defaultVersion)
        html += "<option>" + data.kidroid[j].loader +"</option>";
    }
    $("#selectDefaultKidroidVersion").html(html);
    $("#kidroidVersionDeploy").html(html);
});

socket.on('getVersionDeploy', function (data) {
    var defaultVersion;
    for (var i = 0; i < data.apk.length; i++) {
        if (data.apk[i].default){
            defaultVersion = data.apk[i];
        }
    }
    html = "<option>" + defaultVersion.apk.version +" "+ defaultVersion.apk.build +" current"+"</option>";
    for (var j = 0; j < data.apk.length; j++) {
        if (data.apk[j] != defaultVersion)
            html += "<option>" + defaultVersion.apk.version +" "+ defaultVersion.apk.build +"</option>";
    }
    $("#selectDefaultApkVersion, #addSelectVersion").html(html);
    $("#selectVersionApkToDeploy").html(html);
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
    for (var i = 0; i < data.apk.length; i++) {
        var dateApk = new Date(data.apk[i].date);
        var checkBox = "<td ><input type='checkbox' class='checkAllMarionetteAPK' value=" + data.apk[i]._id + "></td>";
        var name = '<td class="name">'+ dateApk.toLocaleString("en", options) + ' (' + data.apk[i].user + ')</td>';
        var version = '<td class="version">'+ data.apk[i].apk.version + '</td>';
        var build = '<td class="build">'+  data.apk[i].apk.build + '</td>';
        apk += '<tr>'+checkBox+name+version+build+'</tr>';
    }
    for (var j = 0; j < data.kidroid.length; j++) {
        var dateKidroid = new Date(data.kidroid[j].date);
        var checkBoxKid = "<td ><input type=checkbox class='checkAllKidroidVersion' value=" + data.kidroid[j]._id + "></td>";
        var nameKid = '<td class="name">'+ dateKidroid.toLocaleString("en", options) + ' (' + data.kidroid[j].user + ')</td>';
        var versionKid = '<td class="version">'+ data.kidroid[j].loader + '</td>';
        var optionsdKid = '<td class="build"></td>';
        kidroid += '<tr>'+checkBoxKid+nameKid+versionKid+'</tr>';
    }
    $("#settingKidroidVersionTable").html(kidroid);
    $("#settingApkVersionTable").html(apk);
});

var school =  {
    pushData:function(data){
        this.array.push(data)
    },
    getArray:function(){
        return  this.array
    },
    array: []
};
var filter2 =  {
    pushData:function(data){
        this.array.push(data)
    },
    getArray:function(){
        return  this.array
    },
    array: []
};
function startAutoComplete(array,className){

    var Array = $.map(array, function (value, key) { return { value: value, data: key }; });

// Setup jQuery ajax mock:
    $.mockjax({
        url: '*',
        responseTime: 2000,
        response: function (settings) {
            var query = settings.data.query,
                queryLowerCase = query.toLowerCase(),
                re = new RegExp('\\b' + $.Autocomplete.utils.escapeRegExChars(queryLowerCase), 'gi'),
                suggestions = $.grep(Array, function (categorySchool) {
                    // return categorySchool.value.toLowerCase().indexOf(queryLowerCase) === 0;
                    return re.test(categorySchool.value);
                }),
                response = {
                    query: query,
                    suggestions: suggestions
                };

            this.responseText = JSON.stringify(response);
        }
    });
    $(className).autocomplete({
        lookup: Array
    });
}
