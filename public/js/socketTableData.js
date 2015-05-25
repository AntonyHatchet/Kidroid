/**
 * Created by anton_gorshenin on 25.05.2015.
 */
    socket.on('displayData', function (data) {
        html = '';
        for (i in data)
            html += "<tr><td>"+data[i].device_id+"</td><td>"+data[i].registered+"</td><td>"+data[i].school+"</td><td>"+data[i].apk_version+"</td><td><button onclick='showmap("+data[i].longitude+","+data[i].latitude+")'>show map</button></td></tr>";
        $("#userTable").html(html);
    });

        socket.on('quantity', function (pg) {
            html = '';
            Page=Math.ceil(pg/10);
            for (var j = 1; j <=Page ; j++)
                html += "<li><a onclick='socket.emit(\"pageNumder\"," + j*10 + ")'>" + j + "</a></li>";
            $("#pagination").html(html);
    });

        socket.on('category', function (school) {
            html = '';
            for (i in school)
                html += "<tr><td>"+school[i].device_id+"</td><td><a onclick=\"socket.emit('categoryDel')\")>remove</a> / <a href='editCategory'>edit</a></td></tr>";
            $("#tableFilter").html(html);
    });