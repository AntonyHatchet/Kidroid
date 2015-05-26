/**
 * Created by anton_gorshenin on 25.05.2015.
 */
    socket.on('displayData', function (data) {
        html = '';
        for (i in data)
            html += "<tr><td>"+data[i].device_id+"</td><td>"+data[i].registered+"</td><td>"+data[i].school+"</td><td>"+data[i].apk_version+"</td><td><button onclick='showmap("+data[i].longitude+","+data[i].latitude+")'>show map</button></td></tr>";
        $("#userTable").html(html);
    });

        socket.on('quantity', function (data) {
            html = '<ul>';
            Page=Math.ceil(data/10);
            for (var j = 1; j <=Page ; j++)
                html += "<li><a onclick='socket.emit(\"pageNumder\"," + j*10 + ")'>" + j + "</a></li>";
            $("#pagination").html(html);
    });

        socket.on('category', function (school) {
            console.log(school,"category");
            html = '';
            for (var i=0; i< school.length;i++){
                html += "<tr><td>"+school[i].name+"</td><td><button type='button' onclick=\"socket.emit('removeCategory','test')\")>remove</button> / <button href='editCategory'>edit</button></td></tr>";
            }
            $("#tableFilter").html(html);
    });