/**
 * Created by nikolay_ivanisenko on 25.05.2015.
 */
$(document).ready(function(){

    $('ul.tabs li').click(function(){
        var tab_id = $(this).attr('data-tab');

        $('ul.tabs li').removeClass('current');
        $('.tab-content').removeClass('current');

        $(this).addClass('current');
        $("#"+tab_id).addClass('current');
    })

});
function createNewCategory(){
    var nameCategory = $("#newCategory").val();
    socket.emit('createCategory',{name:"" + nameCategory + ""})
    console.log(nameCategory);
};
function find(){
    var DeviceNameIDSerial = $("#DeviceNameIDSerial").val();
    var selectStatus = $("#selectStatus").val();
    var selectCategory = $("#selectCategory").val();
    var selectVersion = $("#selectVersion").val();
    socket.emit('getDevicesByParams',{name:"" + DeviceNameIDSerial + "", status: "" + selectStatus + "", category:"" + selectCategory + "", version:"" + selectVersion + ""})
    console.log(DeviceNameIDSerial, selectStatus, selectCategory, selectVersion);
}
