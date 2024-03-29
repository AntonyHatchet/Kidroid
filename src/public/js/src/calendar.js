// call this from the developer console and you can control both instances
var calendars = {};

$(document).ready( function() {

  // assuming you've got the appropriate language files,
  // clndr will respect whatever moment's language is set to.
  // moment.locale('ru');

  // here's some magic to make sure the dates are happening this month.
  var thisDate = moment().format('YYYY-MM');

  socket.on('allSchedule', function (data) {
    var eventArray=[];
    for (var i in data){
      eventArray.push({date:data[i].timeStart, title: data[i].status});
    }
    calendars.clndr1.setEvents(eventArray);
    //console.log(eventArray);
  });
  //var eventArray = [
  //  { date: thisDate + '-27', title: 'Single Day Event' }
  //];
  //var eventArray2= [
  //  { date: thisDate + '-20', title: 'Single Day Event' }
  //];


  // the order of the click handlers is predictable.
  // direct click action callbacks come first: click, nextMonth, previousMonth, nextYear, previousYear, or today.
  // then onMonthChange (if the month changed).
  // finally onYearChange (if the year changed).

  calendars.clndr1 = $('.calendar').clndr({
    // constraints: {
    //   startDate: '2013-11-01',
    //   endDate: '2013-11-15'
    // },
    clickEvents: {
      click: function(target) {
        //.link('#editSchedule');

        //console.log(target.date._i);
        $('#editSchedule').addClass('in')
            .attr('aria-hidden', false)
            .css('z-index','1050')
            .css('opacity','1')
            .css('display','block');
        document.getElementById('dateSchedule').innerHTML= '<input id="dateScheduleId" class="form-control" type="date" value="' + target.date._i + '">';
        // if you turn the `constraints` option on, try this out:
        // if($(target.element).hasClass('inactive')) {
        //   console.log('not a valid datepicker date.');
        // } else {
        //   console.log('VALID datepicker date.');
        // }
      },
      nextMonth: function() {
        console.log('next month.');
      },
      previousMonth: function() {
        console.log('previous month.');
      },
      onMonthChange: function() {
        console.log('month changed.');
      },
      nextYear: function() {
        console.log('next year.');
      },
      previousYear: function() {
        console.log('previous year.');
      },
      onYearChange: function() {
        console.log('year changed.');
      }
    },
    multiDayEvents: {
      startDate: 'startDate',
      endDate: 'endDate',
      singleDay: 'date'
    },
    showAdjacentMonths: true,
    adjacentDaysChangeMonth: false
  });

  // bind both clndrs to the left and right arrow keys
  $(document).keydown( function(e) {
    if(e.keyCode == 37) {
      // left arrow
      calendars.clndr1.back();
    }
    if(e.keyCode == 39) {
      // right arrow
      calendars.clndr1.forward();
    }
  });

});