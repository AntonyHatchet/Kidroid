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

})

function editCategory() {
    document.getElementById('editCategory').classList.remove('overlay');
}