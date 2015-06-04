/**
 * Created by anton_gorshenin on 25.05.2015.
 */
socket.on('displayData', function (data) {
    //console.log(data.length);
    html = '';
    for (i in data){
        var checkbox = "<td><input type='checkbox' value='option"+ data[i].deviceId +"'></td>";
        var deviceId = "<td>" + data[i].deviceId + "</td>";
        var deviceName = "<td>"+ data[i].name + "<p>(Android v." +data[i].android +")</p></td>";
        var update = (!data[i].updateRequired)? "": "*Pending update (v"+data[i].apkToUpdate.version+" build "+data[i].apkToUpdate.build+")";
        var apkVersion = "<td>" + data[i].apk.version +" (Build "+data[i].apk.build + ")<p>"+ update +"</p></td>";
        var loaderVersion = "<td>"+ data[i].loader +"</td>";
        var status = "<td>" + data[i].status + "</td>";
        var map = "<button href='#map' data-toggle='modal' class='btn btn-default' onclick='showmap(" + data[i].longitude + "," + data[i].latitude + ")'>show map</button>";
        var edit = "<button href='#editDevice' role='button' class='btn btn-primary' data-toggle='modal' onclick='editDeviceWriteIdToken(" + data[i].deviceId +")'>Edit</button> ";
        var deleteDevice = "<button class='btn btn-danger' type='button' onclick=\'socket.emit(\"removeDevice\",\"" + data[i].deviceId + "\")\')>Delete</button>";
        var options = "<td>" + map + edit + deleteDevice + "</td>";
        html += "<tr>" +checkbox+deviceId+deviceName+apkVersion+loaderVersion+status+options+ "</tr>";}
    $("#deviceTable").html(html);
});

socket.on('quantity', function (data) {
    //console.log(data);
    $("h4").html(data + " devices found:");
    $("#deployCount").html(" ("+data+")");
    html = '<nav><ul class="pagination">';
    Page = Math.ceil(data / 10);
    for (var j = 1; j <= Page; j++)
        html += "<li><a onclick='page(" + j + ")'>" + j + "</a></li>";
    $("#pagination").html(html);
});

socket.on('category', function (school) {
    //console.log(school,"category");
    html = '';
    for (var i = 0; i < school.length; i++) {
        html += "<tr><td style=\'display: none\'>" + school[i]._id + "</td><td>" + school[i].name + "</td><td><button class='btn btn-danger' type='button' onclick=\'socket.emit(\"removeCategory\",\"" + school[i]._id + "\")\')>Delete</button> / <a href='#editCategory' role='button' class='btn btn-primary' data-toggle='modal' onclick='renameCategoryId(\"" + school[i]._id + "\")'>Edit</a></td></tr>";
    }
    $("#tableFilter").html(html);
});

socket.on('category', function (date) {
    //console.log(date, "category");
    html = '<option value="" style="color:#cccccc">Select school</option>';
    for (var i = 0; i < date.length; i++) {
        html += "<option>" + date[i].name + "</option>";
    }
    $("#selectCategory, #addSelectCategory, #editDeviceCategory, #scheduleDeviceCategory").html(html);
});

socket.on('version', function (date) {
    //console.log(school,"category");
    html = '<option value="" style="color:#cccccc">Select version</option>';
    for (var i = 0; i < date.length; i++) {
        html += "<option>" + date[i].apk.version +" "+ date[i].apk.build +"</option>";
    }
    $("#selectVersion, #addSelectVersion, #editDeviceVersion, #scheduleDeviceVersion, #scheduleDeviceVersionFilter").html(html);
});
socket.on('version', function (date) {
    //console.log(school,"category");
    html = '';
    for (var i = 0; i < date.length; i++) {
        html += "<tr><td>" + date[i].apk.version + "</td><td>" + date[i].apk.build + "</td><td><button class='btn btn-danger' type='button' onclick=\'socket.emit(\"removeVersion\",\"" + date[i]._id + "\")\')>Delete</button>";
    }
    $("#versionTable").html(html);
});

socket.on('users', function (data) {
    //console.log(data);
    html = '';
    for (i in data)
        html += "<tr><td>" + data[i]._id + "</td><td>" + data[i].local.name + "</td><td><button class='btn btn-danger' type='button' onclick=\'socket.emit(\"removeUsers\",\"" + data[i]._id + "\")\')>Delete</button></td></tr>";
    $("#userTable").html(html);
});

socket.on('allDeviceCreated', function (data) {
    if (data.deviceId){
        $(".modal-body textarea").append("ID " +data.deviceId+"\n")
    }
    $(".modal-body textarea, .modal-body textarea p").css({"display":"block"})
});

socket.on('error', function (date) {
    console.log(date,"error");
});

socket.on('deviceScheduled', function (data) {
    //console.log(data);
    html = '';
    for (i in data)
        html += "<tr><td><input type='checkbox' id='checkSchedule" + data[i].deviceId + "' class='checkSchedule' value='" + data[i].deviceId + "'></td><td>" + data[i].deviceId + "</td><td>" + data[i].school + "</td><td>" + data[i].apk_version + "</td><td></td><td></td></tr>";
    $("#tableSchedule").html(html);
});

socket.on('allSchedule', function (data) {
    console.log(data);
    html = '';
    for (i in data)
        html += "<p>" + data[i].date + "</p>";
    $("#allSchedule").html(html);
});