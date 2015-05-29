/**
 * Created by anton_gorshenin on 25.05.2015.
 */
socket.on('displayData', function (data) {
    console.log(data.length);
    html = '';
    for (i in data)
        html += "<tr><td>" + data[i].device_id + "</td><td>" + data[i].registered + "</td><td>" + data[i].school + "</td><td>" + data[i].apk_version + "</td><td><button class='btn btn-default' onclick='showmap(" + data[i].longitude + "," + data[i].latitude + ")'>show map</button></td><td><button class='btn btn-default' type='button' onclick=\'socket.emit(\"removeDevice\",\"" + data[i].device_id + "\")\')>delete</button></td></tr>";
    $("#deviceTable").html(html);
});

socket.on('quantity', function (data) {
    html = '<ul>';
    Page = Math.ceil(data / 10);
    for (var j = 1; j <= Page; j++)
        html += "<li><a onclick='page(" + j + ")'>" + j + "</a></li>";
    $("#pagination").html(html);
});

socket.on('category', function (school) {
    //console.log(school,"category");
    html = '';
    for (var i = 0; i < school.length; i++) {
        html += "<tr><td style=\'display: none\'>" + school[i]._id + "</td><td>" + school[i].name + "</td><td><button class='btn btn-default' type='button' onclick=\'socket.emit(\"removeCategory\",\"" + school[i]._id + "\")\')>remove</button> / <a href='#editCategory' role='button' class='btn btn-primary' data-toggle='modal' onclick='renameCategoryId(\"" + school[i]._id + "\")'>Edit</a></td></tr>";
    }
    $("#tableFilter").html(html);
});

socket.on('category', function (date) {
    //console.log(date, "category");
    html = '<option value="" style="color:#cccccc">Select school</option>';
    for (var i = 0; i < date.length; i++) {
        html += "<option>" + date[i].name + "</option>";
    }
    $("#selectCategory, #addSelectCategory").html(html);
});

socket.on('version', function (date) {
    //console.log(school,"category");
    html = '<option value="" style="color:#cccccc">Select version</option>';
    for (var i = 0; i < date.length; i++) {
        html += "<option>" + date[i].version_apk + "</option>";
    }
    $("#selectVersion, #addSelectVersion").html(html);
});

socket.on('users', function (data) {
    console.log(data);
    html = '';
    for (i in data)
        html += "<tr><td>" + data[i]._id + "</td><td>" + data[i].local.name + "</td><td><button class='btn btn-default' type='button' onclick=\'socket.emit(\"removeUsers\",\"" + data[i]._id + "\")\')>delete</button></td></tr>";
    $("#userTable").html(html);
});

socket.on('error', function (date) {
    console.log(date,"error");
});