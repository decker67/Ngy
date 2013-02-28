/*
 jquery mobule code to implement the view
 */

(function volta( $ ) {

    "use strict";

    var KWH = ' kWh',
        energyValues = [],
        selectedEntryId = null;

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
        var hours = addZero( date.getHours() ), // - date.getTimezoneOffset() / 60 ),
            minutes = addZero( date.getMinutes() ),
            seconds = addZero( date.getSeconds() );
        return hours + ':' + minutes + ':' + seconds;
    }

    //-----------------------------------------------------------------------------------------------------------

    function deleteEntry( id  ) {
        energyValues.splice( selectedEntryId, 1 );
        recalculateConsumptions( id );
        saveEntriesToStore( )
    }

    //-----------------------------------------------------------------------------------------------------------

    function saveEntry( dateId, timeId, energy_counterId, entryId ) {
        var date = new Date( $( dateId ).val() + 'T' + $( timeId ).val()),
            energy_counter = parseInt( $( energy_counterId ).val(), 10 ),
            newValue = {
                'date': date,
                'energy_counter': energy_counter,
                'consumption': {
                    'day': 0,
                    'month': 0,
                    'year': 0
                }
            };

        //NEEDS FIX B: does not work in different timezone
        date.setHours( date.getHours() - 1 );
        if( entryId !== undefined && entryId !== null ) { //update of existing value
          energyValues[ entryId ] = newValue;
        } else {
           energyValues.push( newValue );
        }
        energyValues.sort( function( operand1, operand2 ) { return operand1.date - operand2.date; } );
        recalculateConsumptions( energyValues.indexOf( newValue ) );
        saveEntriesToStore( energyValues );
    }

    //-----------------------------------------------------------------------------------------------------------

    function recalculateConsumptions( fromId ) {
        var i = -1,
            previousValue = null;

       if( fromId < 0 || fromId >= energyValues.length || energyValues.length === 0 ) {
           return;
       }

       for( i = fromId; i < energyValues.length; ++i ) {
         if( i === 0 ) {
            energyValues[ i ].consumption =  {
               'day': 0,
               'month': 0,
               'year': 0
            };
         } else {
            previousValue = energyValues[ i - 1 ];
            energyValues[ i ].consumption = calculateConsumption( previousValue, energyValues[ i ] );
         }
       }
    }

    //-----------------------------------------------------------------------------------------------------------

    function getPreviousValue( newValue ) {
        var i = -1,
            found = false;
        if( energyValues.length === 0 ) {
           return null;
        }
        for( i = energyValues.length - 1; i >= 0; --i ) {
            if( energyValues[ i ].date < newValue.date ) {
               found = true;
               break;
            }
        }
        if( found ) {
           return energyValues[ i ];
        }
        return null;
    }

    //-----------------------------------------------------------------------------------------------------------

    function calculateConsumption( from, to ) {
        var EMPTY_CONSUMPTION = {
                'day': 0,
                'month': 0,
                'year': 0
            },
            fromTimestamp = null,
            toTimestamp = null,
            delta_counter = null,
            consumption = EMPTY_CONSUMPTION;

        if( from === null || to === null || to.energy_counter <= from.energy_counter ) {
           return consumption;
        }

        delta_counter = ( to.energy_counter - from.energy_counter )
            / ( to.date - from.date )
            * 1000 * 60 * 60 * 24;
        consumption.day = Math.floor( delta_counter );
        consumption.month = Math.floor( delta_counter * 30 );
        consumption.year = Math.floor( delta_counter * 365 );
        return consumption;
    }

    //-----------------------------------------------------------------------------------------------------------

    function removeAllEntries( ulElement ) {
        ulElement.children().off( 'click' );
        ulElement.empty();
    }

    //-----------------------------------------------------------------------------------------------------------

    function addAllEntries( ulElement, list ) {
        var listItem = null,
            i = null;

        for( i = list.length - 1; i >= 0; --i ) {
            listItem = '<li data-entry-id="' + i +
                '" data-theme="c"><a href="#edit_entry" data-transition="slide">' +
                getDateAsISOString( list[ i ].date ) + ' ' + getTimeAsISOString( list[ i ].date ) + ': ' + list[ i ].energy_counter + '</a></li>';
            ulElement.append( listItem );
        }
        //handle selection of entry in
        ulElement.children().on( 'click', function( event ) {
            event.stopPropagation();
            selectedEntryId = parseInt( event.currentTarget.getAttribute( 'data-entry-id' ), 10 ) ;
            console.log( 'selectedEntry:' + selectedEntryId );
        });

    }

    //-----------------------------------------------------------------------------------------------------------

    function saveEntriesToStore( energyValues ) {
        $.jStorage.set( 'energyValues', energyValues );
    }

    //-----------------------------------------------------------------------------------------------------------

    function readEntriesFromStorage() {
        var entriesFromStorage = $.jStorage.get( 'energyValues' ) || [],
            i = -1;
        for( i = 0; i < entriesFromStorage.length; ++i ) {
            entriesFromStorage[ i ].date = new Date( entriesFromStorage[ i ].date );
        }
        return entriesFromStorage;
    }

    //-----------------------------------------------------------------------------------------------------------
    // main
    //-----------------------------------------------------------------------------------------------------------

    $( '#save_new_entry' ).bind( 'click', function saveClicked( event, ui ) {
       saveEntry( '#new_date', '#new_time', '#new_energy_counter' );

       $.mobile.changePage( '#consumption', {
           transition: 'fade',
           reverse: false,
           changeHash: false
       } );
    } );

    // read all saved counters from local storage
    $( '#enter_new_energy_counter' ).live( 'pagebeforecreate', function() {
       energyValues = readEntriesFromStorage();
       var now = new Date(),
           dateAsString = getDateAsISOString( now ),
           timeAsString = getTimeAsISOString( now );
       $( '#new_time' ).val( timeAsString );
       $( '#new_date').val( dateAsString );
      //NEEDS FIX A: check if inputs are valid and show pop up if not
       if( energyValues.length > 0 ) {
          var lastEnergyValue = energyValues[ energyValues.length - 1 ];
          $( '#new_energy_counter' ).val( lastEnergyValue.energy_counter );
       } else {
          $( '#new_energy_counter' ).val( 0 );
       }
    } );

    // calculate consumption using the last two energy values
    $( '#consumption' ).live( 'pagebeforeshow', function() {
        var consumption = energyValues[ energyValues.length - 1 ].consumption;

        $( '#dayEstimation').html( consumption.day + KWH );
        $( '#monthEstimation').html( consumption.month + KWH );
        $( '#yearEstimation').html( consumption.year + KWH );
    } );

    // show all energy values in a list
    $( '#all_entries' ).live( 'pagebeforeshow', function() {
        var ulElement = $( '#entries' );
        removeAllEntries( ulElement );
        addAllEntries( ulElement, energyValues );
        ulElement.listview( 'refresh' );
    } );

    $( '#edit_entry' ).live( "pagebeforeshow", function() {
        if( selectedEntryId !== null ) {
            var entry = energyValues[ selectedEntryId ];
            console.log( entry );
            $( '#entry_date' ).val( getDateAsISOString( entry.date ) );
            $( '#entry_time' ).val( getTimeAsISOString( entry.date ) );
            $( '#entry_energy_counter' ).val( entry.energy_counter );
        } else {
            $.mobile.changePage( '#list' );
        }
    } );

    // show chart with all values
    $( '#graph' ).live( 'pageshow', function() {
        var chartValues = [],
            i = null,
            value = null,
            yMin = Number.MAX_VALUE,
            yMax = Number.MIN_VALUE,
            xMin = null,
            xMax = null;

        if( energyValues.length === 0 ) {
           //NEEDS FIX B: show empty chart
           return;
        }

        xMin = energyValues[ 0 ].date,
        xMax = energyValues[ energyValues.length - 1 ].date;

        for( i = 0; i < energyValues.length; ++i ) {
          value = energyValues[ i ].energy_counter;
          yMin = Math.min( value, yMin );
          yMax = Math.max( value, yMax );
          chartValues.push( [ energyValues[ i ].date, value ] );
        }

        //NEEDS FIX B: show no decimals on y axis
        $.jqplot( 'chart',  [ chartValues ],
           { title:'Verbrauchsverlauf',
             series:[ {color:'red'} ],
               highlighter: {
                   show: true,
                   sizeAdjust: 7.5
               },
               cursor: {
                   show: false
               },
               axes:{
                 xaxis: {
                     label: 'Tag',
                     min: xMin,
                     max: xMax,
                     renderer: $.jqplot.DateAxisRenderer,
                     tickOptions:{
                         formatString:'%b&nbsp;%#d'
                     }/*,
                     labelRenderer: $.jqplot.CanvasAxisLabelRenderer*/
                 },
                 yaxis:{
                     label:'Zählerstand',
                     min: yMin,
                     max: yMax/*,
                     labelRenderer: $.jqplot.CanvasAxisLabelRenderer*/
                 }
             }/*,
             axesDefaults: {
                tickRenderer: $.jqplot.CanvasAxisTickRenderer,
                tickOptions: {
                    angle: -90
                }
             }*/
           } );
    } );

    //handle deletion of entry
    $( '#delete_entry' ).delegate( '', 'click', function( event ) {
        event.stopPropagation();
        deleteEntry( selectedEntryId );
    });
    //handle save of entry
    $( '#save_entry' ).delegate( '', 'click', function( event ) {
        event.stopPropagation();
        saveEntry( '#entry_date', '#entry_time', '#entry_energy_counter', selectedEntryId );
    });



})( $ );
