/**
 * Created by anton_gorshenin on 25.05.2015.
 */

socket.on('displayData', function (data) {
    //console.log(data.length);
    html = '';
    for (i in data){
        var checkbox = "<td><input type='checkbox' class='checkboxWarning' value="+ data[i].deviceId +"></td>";
        var deviceId = "<td>" + data[i].deviceId + "</td>";
        var deviceName = "<td>"+ data[i].name + "<p>(Android v." +data[i].android +")</p></td>";
        var update = (!data[i].updateRequired)? "": "*Pending update (v"+data[i].apkToUpdate.version+" build "+data[i].apkToUpdate.build+")";
        var apkVersion = "<td>" + ((!data[i].apk.version >=1 )? "-" : data[i].apk.version +" (Build "+data[i].apk.build + ")") + "<p>"+ update +"</p></td>";
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
        var edit = "<button href='#editDevice' role='button' class='btn btn-primary' data-toggle='modal' onclick='editDeviceWriteIdToken(" + data[i].deviceId +")'>Edit</button> ";
        //var deleteDevice = "<button class='btn btn-danger' type='button' onclick=\'socket.emit(\"removeDevice\",\"" + data[i].deviceId + "\")\')>Delete</button>";
        var options = "<td><div class='btn-group' role='group'>" + map + edit + "</div></td>";
        html += "<tr>" +checkbox+deviceId+deviceName+apkVersion+loaderVersion+status+options+ "</tr>";
    }
    $("#deviceTable").html(html);
});

socket.on('quantity', function (data) {
    //console.log(data);
    $("h4").html(data + " devices found:");
    $("#deployCount").html(" ("+data+")");
    $("#deployCountKidroid").html(" ("+data+")");
    html = '<nav><ul class="pagination">';
    Page = Math.ceil(data / 10);
    for (var j = 1; j <= Page; j++)
        html += "<li><a onclick='page(" + j + ")'>" + j + "</a></li>";
    $("#pagination").html(html);
});

socket.on('category', function (school) {
    html = '';
    for (var i = 0; i < school.length; i++) {
        category.pushData(school[i].name);
        html += "<tr><td style=\'display: none\'>" + school[i]._id + "</td><td><input type='checkbox' class='checkAllCategory' placeholder='- School -' value="+ school[i]._id +"></td><td>" + school[i].name + "</td><td><a href='#editCategory' role='button' class='btn btn-primary' data-toggle='modal' onclick='renameCategoryId(\"" + school[i]._id + ',' + school[i].name + "\")'>Edit</a></td></tr>";
    }
    $("#tableFilter").html(html);
    startAutoComplete(category.getArray(),".category")
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
    for (i in data)
        html += "<tr><td><input type='checkbox' id='checkAllUsers" + data[i]._id + "' class='checkAllUsers' value='" + data[i]._id + "'></td><td>" + data[i].local.name + "</td><td><a href='#editUsers' role='button' class='btn btn-primary' data-toggle='modal' onclick='editUsers(\"" + data[i]._id + "\")'>Edit</a></td></tr>";
    $("#userTable").html(html);
});

socket.on('allDeviceCreated', function (data) {
    if (data.deviceId){
        $('#idDevice').addClass('in')
            .attr('aria-hidden', false)
            .css('z-index','1050')
            .css('opacity','1')
            .css('display','block');
        $("#idDeviceCreate").append("ID " +data.deviceId+"\n")
        //TODO сделать вывод созданного колличества устройств
        $("#numberIdDevice").replaceWith( "Devices has been added successfully" );
    }
    $(".idTextarea textarea, .idTextarea textarea p").css({"display":"block"})

});

socket.on('error', function (date) {
    console.log(date,"error");
});

socket.on('deviceScheduled', function (data) {
    //console.log(data);
    html = '';
    for (i in data)
        html += "<tr><td><input type='checkbox' class='checkSchedule' id='checkSchedule" + data[i].deviceId + "'  value='" + data[i].deviceId + "'></td><td>" + data[i].deviceId + "</td><td>" + data[i].school + "</td><td>" + data[i].apk_version + "</td><td></td><td></td></tr>";
    $("#tableSchedule").html(html);
});

socket.on('filters', function (data) {
    //console.log(data);
    html = '';
    for (i in data)
        html += "<tr><td><input type='checkbox' class='checkAllFilters' id='checkSchedule" + data[i].id + "'  value='" + data[i].id + "'></td><td>" + data[i].name + "</td><td>" + data[i].params + "</td></tr>";
    $("#filtersTable").html(html);
});

socket.on('allSchedule', function (data) {
    console.log(data);
    html = '<ul>';
    for (i in data)
        html += "<tr><td>" + data[i].timeStart + "</td><td>" + data[i].devices + "</td><td></td><td></td></tr>";
    $("#allSchedule").html(html);
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
    html = "<option>" + defaultVersion.apk.build +" current"+"</option>";
    for (var j = 0; j < data.apk.length; j++) {
        if (data.apk[j] != defaultVersion)
            html += "<option>" + data.apk[j].apk.build +"</option>";
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
        var dateKidroid = new Date(data.kidroid[i].date);
        var checkBoxKid = "<td ><input type=checkbox class='checkAllKidroidVersion' value=" + data.kidroid[i]._id + "></td>";
        var nameKid = '<td class="name">'+ dateKidroid.toLocaleString("en", options) + ' (' + data.kidroid[i].user + ')</td>';
        var versionKid = '<td class="version">'+ data.kidroid[i].loader + '</td>';
        var buildKid = '<td class="build">'+  data.kidroid[i].loader + '</td>';
        var optionsdKid = '<td class="build"></td>';
        kidroid += '<tr>'+checkBoxKid+nameKid+versionKid+buildKid+optionsdKid+'</tr>';
    }
    $("#settingKidroidVersionTable").html(kidroid);
    $("#settingApkVersionTable").html(apk);
});

var category =  {
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
