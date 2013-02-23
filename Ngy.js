/*
 jquery mobule code to implement the view
 */

(function volta( $ ) {

    "use strict";

    var KWH = ' kWh';

    var energyValues = [];

    //-----------------------------------------------------------------------------------------------------------

    // returns string with preceding 0 or the orginial value
    function addZero( value ) {
        return (value < 10) ? '0' + value : value;
    }

    //-----------------------------------------------------------------------------------------------------------

    function getDateAsISOString( date ) {
        var day = addZero( date.getDate() ),
            month = addZero( date.getMonth() + 1 ),
            year = addZero( date.getFullYear() );
        return year + '-' + month + '-' + day;
    }

    //-----------------------------------------------------------------------------------------------------------

    function getTimeAsISOString( date ) {
        var hours = addZero( date.getHours()), // - date.getTimezoneOffset() / 60 ),
            minutes = addZero( date.getMinutes() + 1 ),
            seconds = addZero( date.getSeconds() );
        return hours + ':' + minutes + ':' + seconds;
    }

    //-----------------------------------------------------------------------------------------------------------

    function areAtLeastTwoEnergyValuesAvailable() {
      return energyValues.length >= 2;
    }

    //-----------------------------------------------------------------------------------------------------------

    function calculateConsumption( from, to ) {
        var fromTimestamp = Date.parse( from.date + 'T' + from.time ),
            toTimestamp = Date.parse( to.date + 'T' + to.time );
        var delta_counter = ( to.energy_counter - from.energy_counter )
            / ( toTimestamp - fromTimestamp )
            * 1000 * 60 * 60 * 24;
        return {
            'day':   delta_counter,
            'month': delta_counter * 30,
            'year':  delta_counter * 365
        };
    }

    //-----------------------------------------------------------------------------------------------------------

    function removeAllEntries( ulElement ) {
        ulElement.empty();
    }

    //-----------------------------------------------------------------------------------------------------------

    function addAllEntries( ulElement, list ) {
        var listItem = null,
            i = null;

        for( i = list.length - 1; i >= 0; --i ) {
            listItem = '<li data-entry-id="' + i +
                '" data-theme="c"><a href="#entry" data-transition="slide">' +
                list[ i ].date + ' ' + list[ i ].time + ': ' + list[ i ].energy_counter + '</a></li>';
            ulElement.append( listItem );
        }
    }

    //-----------------------------------------------------------------------------------------------------------

    function saveEnergyCounter( date, time, energy_counter ) {
        energyValues.push( {
            'date': date,
            'time': time,
            'energy_counter': energy_counter
        } );
        console.log( energyValues );
        //should sort the array
        $.jStorage.set( 'energyValues', energyValues );
    }

    //-----------------------------------------------------------------------------------------------------------
    // main
    //-----------------------------------------------------------------------------------------------------------

    $( '#save' ).bind( 'click', function saveClicked( event, ui ) {
        var date = $( '#date' ).val();
        var time = $( '#time' ).val();
        var energy_counter = $( '#energy_counter' ).val();

        saveEnergyCounter( date, time, energy_counter );

        if( areAtLeastTwoEnergyValuesAvailable() ) {
           $.mobile.changePage( '#consumption', {
               transition: 'fade',
               reverse: false,
               changeHash: false
           });
        }
    } );

    // read all saved counters from local storage
    $( '#enter_energy_counter' ).live( 'pagebeforecreate', function() {
       energyValues = $.jStorage.get( 'energyValues' ) || [];
       var now = new Date(),
           dateAsString = getDateAsISOString( now ),
           timeAsString = getTimeAsISOString( now );
       $( '#time' ).val( timeAsString );
       $( '#date').val( dateAsString );
       if( energyValues.length > 0 ) {
          var lastEnergyValue = energyValues[ energyValues.length - 1 ];
          $( '#energy_counter' ).val( lastEnergyValue.energy_counter );
       } else {
          $( '#energy_counter' ).val( 0 );
       }
    } );

    // calculate consumption using the last two energy values
    $( '#consumption' ).live( 'pagebeforeshow', function() {
        var fromPosition = energyValues.length - 2;
        var toPosition = energyValues.length - 1;
        var consumption = calculateConsumption( energyValues[ toPosition ], energyValues [ fromPosition ] );

        $( '#dayEstimation').html( consumption.day + KWH );
        $( '#monthEstimation').html( consumption.month + KWH );
        $( '#yearEstimation').html( consumption.year + KWH );
    } );

    // calculate consumption using the last two energy values
    $( '#list' ).live( 'pagebeforeshow', function() {
        var ulElement = $( '#entries' );
        removeAllEntries( ulElement );
        addAllEntries( ulElement, energyValues );
        ulElement.listview( 'refresh' );
    } );

    // show chart with all values
    $( '#graph' ).live( 'pagebeforeshow', function() {
        $.jqplot( 'chart',  [[[1, 2],[3,5.12],[5,13.1],[7,33.6],[9,85.9],[11,219.9]]]);
    } );




})( $ );
