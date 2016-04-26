// HACK: The IMD is a special case because severity / numerical value are
// inversely related and it is not available at a local authority level.
HACK_IMD_TITLE = 'Indices of Multiple Deprivation (IMD)';

var povmon_dataset = null;

var chart = null;
var map = null;
var table = null;

var x_axis_name = 'geo_name';

var detail_level = '';

// Not all platforms implement a javascript console.
if ( ! console ) {
    console = {
        debug:function(){},
        warn:function(){},
        error:function(){}
    };
}

function recreateChart( indicator )
{
    // Destroy any previous chart.
    if ( chart ) {
        chart.destroy();
        delete chart;
    }

    var x_axis_id = 'geoname';
    var x_axis_title = 'Local authority';
    var chart_detail_level = DetailLevel.LA;


    var HACK = 0;
    var columns = indicator.iterations.map( function(iteration) {
        HACK++;
        return [ iteration.title+HACK ].concat( iteration.values );
    });
    columns.unshift( [ x_axis_id ].concat( indicator.iterations[0].geoNames ));
    console.debug(columns);


    var config = {
        bindto: '#chart',
        size: {
            height: 400
        },
        data: {
            x: x_axis_id,
            columns: columns,
            type: 'bar'
        },
        axis: {
            x: {
                type: 'category',
                label: {
                    text: x_axis_title,
                    position: 'outer-center'
                }
                ,
                tick: {
                    rotate: -35,
                    multiline: false
                }
                ,
                height: 100

            },
            y: {
                label: {
                    text: indicator.chartYAxisLabel,
                    position: 'outer-middle'
                }
            }
        },
        legend: {
            show: false
        },
        color : {
            pattern: [ '#009ec8', '#79bb59', '#cad401', '#00a5aa' ]
        }
    };

    c3.generate(config);
}

function recreateTable ( indicator )
{
    if ( table ) {
        // This fn is in the API docs but console says it does not exist.
        // table.destroy( true );
        delete table;
    }

    // Get rid of any previous table.
    jQuery('#table').empty();

    // Establish the number of rows in the table.
    var num_rows = indicator.iterations[0].values.length;

    // Check for a dataset that we do not know how to handle.
    // i.e. One with a different number of rows.
    for ( var i=1; i<indicator.iterations.length; i++ ) {
        if ( indicator.iterations[i].values.length != num_rows ) {

            debugger;

            console.error("\
Iterations for the current indicator have different numbers of values!\n\
They may be based on different goegraphical areas." );
            console.error( indicator );

            jQuery('#table').append("<p>\
Iterations for the current indicator have different numbers of values!\
They may be based on different goegraphical areas.</p>" );

            return;
        }
    }

    // Create an empty table.
    jQuery('#table').append(
        '<table cellpadding="0" cellspacing="0" border="0" class="display"></table>' );

    // Generate the table data and metadata.

    var config = {
        // Order column by the most recent data.
        order:[[ indicator.numIterations, "desc" ]]
    };

    config.data = indicator.iterations[0].geoNames.map( function ( geoname, index ) {
            var values = indicator.iterations.map( function(iteration) {
                var value = iteration.values[index];
                // ASSUMPTION: Negative data is invalid. Our current data source
                // cannot contain nulls, hence the use of negative numbers.
                return value >= 0 ? value : "No valid data";
            });
        values.unshift(geoname);
        return values;
    } );

    config.columns = indicator.iterations.map( function(iteration) {
        return {
            title : iteration.title,
            // Data may contain strings that describe missing data points.
            // Force sorting to work for numbers rather than words.
            type : "num"
        }
    });
    config.columns.unshift( { title : "Area" } );

//     console.debug(config);

    if ( num_rows <= 20 ) {
        config.paging = false;         // Turn off paging
        config.info = false;           // Turn off paging info
        config.bFilter = false;        // Turn off search
        config.pageLength = num_rows;  // Remove empty rows

        // Colour the background of wider regional rows differently.
        config.rowCallback = function( row, data, index ) {
            if ( ['Greater Manchester','North West','England'].indexOf( data[0] ) != -1 ) {
                jQuery( row ).addClass( 'region' ).removeClass( 'local-authority' );
            }
            else {
                jQuery( row ).removeClass( 'region' ).addClass( 'local-authority' );
            }
        };
    }

    table = jQuery('#table table').dataTable( config );
}

function getMapSql( iteration, detail_level )
{
    var sql = 'SELECT cartodb_id, geo_name, the_geom, the_geom_webmercator, '
    + iteration.key + " as indicator, '" + iteration.unitsLabel + "' as units FROM "
    + iteration.datasetName + '_with_' + detail_level
    + '_boundaries WHERE the_geom IS NOT NULL AND 0.0 <= ' + iteration.key;
    console.debug(sql);
    return sql;
}

function getColourRampCss( colour, value, inverse )
{
    var comparator;
    if ( inverse ) {
        comparator = '>=';
    } else {
        comparator = '<=';
    }

    return '\n\
#localauthoritymultiindicator_withboundaries [ indicator ' + comparator + value + '] {  \n\
polygon-fill: ' + colour + ';  \n\
}';
}

function getMapCss( min, max, show_labels, inverse_ramp )
{
    var result = "\n\
/** choropleth visualization */   \n\
\n\
#localauthoritymultiindicator_withboundaries{   \n\
polygon-fill: #FFFFB2;   \n\
polygon-opacity: 0.8;   \n\
line-color: #FFF;   \n\
line-width: 0.5;   \n\
line-opacity: 1;   \n\
}   \n\
\n"

if ( show_labels ) {
    result +=
        "#localauthoritymultiindicator_withboundaries::labels {   \n\
text-name: [" + x_axis_name + "];   \n\
text-face-name: 'DejaVu Sans Book';   \n\
text-size: 14;   \n\
text-label-position-tolerance: 10;   \n\
text-fill: #555;   \n\
text-halo-fill: #fff;   \n\
text-halo-radius: 1.5;   \n\
text-dy: -10;   \n\
text-allow-overlap: true;   \n\
text-placement: point;   \n\
text-placement-type: simple;   \n\
}   \n\
";
}

    var colours =
        [ '#B10026', '#E31A1C', '#FC4E2A', '#FD8D3C', '#FEB24C', '#FED976', '#FFFFB2' ];

    var getSteps = function( min, max, num_steps, inverse ) {
        var result = [];
        var inc = (max-min)/num_steps;

        var start;
        if ( inverse ) {
            start = min;
        } else {
            start = max; inc = -inc;
        }

        for ( var v = start, i = 0; i < num_steps; i++, v += inc ) {
            result.push(v);
        }
        return result;
    }

    var vals = getSteps( min, max, colours.length, inverse_ramp );

    colours.forEach( function ( colour, index ) {
        var val = vals[index];
        var colourCSS = getColourRampCss( colour, val, inverse_ramp );
        result += colourCSS;
    } );

    return result;
}

function updateMapForIndicator( indicator )
{
//     console.debug(indicator);
    var iteration = indicator.latestIteration;

    jQuery('#map-label').text(indicator.mapLabel)

    map.getLayers()[1].getSubLayers()[0].setSQL(
        getMapSql(iteration, indicator.detailLevel) );

    // Remove negative values from the data. (They indicate invalid data.)
    // Remove big things from the data. (They will not be shown on the map and
    // should not affect the chloropleth.)
    var data = iteration.values.filter( function(val, index) {
        return val >= 0  &&  ! geoCodeInRange( DetailLevel.BIG, iteration.geoCodes[index] );
    });
    var min = Math.min.apply(null, data);
    var max = Math.max.apply(null, data);

    var show_labels = indicator.detailLevel == DetailLevel.LA;
    var inverse_measure = indicator.title == HACK_IMD_TITLE;
//     console.debug( inverse_chloropleth );

    map.getLayers()[1].getSubLayers()[0].setCartoCSS(
        getMapCss(min, max, show_labels, inverse_measure) );

    if ( indicator.title == HACK_IMD_TITLE ) {
        jQuery( '.cartodb-legend-stack .min' ).text( "Least deprived" );
        jQuery( '.cartodb-legend-stack .max' ).text( "Most deprived" );
    } else {
        jQuery( '.cartodb-legend-stack .min' ).text( min +' '+ iteration.unitsLabel );
        jQuery( '.cartodb-legend-stack .max' ).text( max +' '+ iteration.unitsLabel );
    }
}

function updateSelectorForIndicator( indicator )
{
    jQuery( '#measure-selector li' ).removeClass( 'active' );
    jQuery( '#measure-selector li[measure="' + indicator.name + '"]' ).addClass( 'active' );
}

function updateLinksForIndicator( indicator )
{
    jQuery( '#list-of-links > li > a' ).each( function () {
        var href = jQuery(this).attr('href');

        var indicator_index = href.indexOf( '&measure=' );
        if ( -1 != indicator_index ) {
            // ASSUMPTION: 'measure' is always the final param in the query string.
            // TO DO: Implement this in a more robust way in case we
            //        dynamically alter these links in other ways later.
            href = href.slice( 0, indicator_index );
        }

        jQuery(this).attr('href', href + '&measure=' + indicator.title);
    });
}

function selectIndicator( indicator )
{
    jQuery( '#measure-name' ).text( indicator.title );

    jQuery( '#intro-text' )
    .empty()
    .append( paragraphise(indicator.visualisationIntroText) );

    jQuery( '#description-link' )
    .empty()
    .append( '<p>For further information about this data set, please see the accompanying "\
<a href="/poverty-monitor/indicator-descriptions/?name='
            + encodeURIComponent(indicator.title)
            + '">About this indicator</a>" page.</p>'  );

    updateSelectorForIndicator( indicator );
    updateMapForIndicator( indicator );
    updateLinksForIndicator( indicator );

    recreateTable( indicator );

    if ( detail_level == DetailLevel.LA ) {
        recreateChart( indicator );
    }
}

function onMeasureClicked(e)
{
    selectIndicator(
        povmon_dataset.indicator(
            jQuery(e.currentTarget).attr('measure'), detail_level ) );
}

// Once the various page elements have been created, set the initial measure
// to be viewed. This may be in the URL. If not, choose a default.
//
function setInitialIndicator() {

    // Does the URL say which indicator should be shown?
    var indicator_name = getParameterFromQueryString( 'measure' ) || "";
    if ( indicator_name && povmon_dataset.isIndicatorName(indicator_name) ) {

        // Query string contained information about the indicator to show.
        var indicator = povmon_dataset.indicator( indicator_name, detail_level );

        if ( indicator ) {
            console.debug( ["Initialising with indicator found from query string", indicator_name, indicator] );
            selectIndicator( indicator );
            return;
        }

        // Requested indicator has no data at this detail level.
        jQuery('#user-messages').css("display", "");
        jQuery('#user-messages li').text(
            'Information for '+indicator_name+' is not available at this detail level.'
        );
    }

    // URL did not identify an indicator.
    console.debug( 'No loadable indicator found in query string ("' + indicator_name + '")' );
    selectIndicator(
        povmon_dataset.indicator(
            povmon_dataset.availableIndicators(detail_level)[0].name, detail_level
    ));
}

function createSelector( dataset )
{
    dataset.availableIndicators(detail_level).forEach(
        function (indicator) {
            jQuery( '#measure-selector ul' )
            .append(
                jQuery('<li>')
                .attr( 'measure', indicator.name )
                .click( onMeasureClicked )
                .append(
                    jQuery( '<a>' + indicator.name + '</a>' )
                )
            );
        }
    );
}

// HACK??? Asynchrous creation of map and other page elements means that
// they could become ready in either order. Set initial indicator when
// they are both complete.
var callback_countdown = 2;
function onCallbackComplete() {
    callback_countdown--;
    if ( callback_countdown == 0 ) {
        setInitialIndicator();
    }
}

function makePageElements( dataset )
{
    povmon_dataset = dataset;
    createSelector( dataset );
    onCallbackComplete();
}

function createMap ( mapId )
{
    var config = {
        shareable: false,
        search: false,
        zoom: 10
    };

    map = cartodb.createVis(
        'map',
        'https://gmpagdata.cartodb.com/api/v2/viz/' + mapId + '/viz.json',
        config
    );

    map.on('done', function ( vis ) {

        // Map dragging messes up mobile navigation of the page. Turn it
        // off on small screens.
        if ( window.innerHeight <= 640 ) {
            vis.getNativeMap().dragging.disable();
        }

        onCallbackComplete();
    } );
}

// Stole this from somewhere. Probably StackOverflow.
function getParameterFromQueryString(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        // Lines above are for JS file. Lines below are for ruby string.
        //         name = name.replace(/[\[]/, "\\\\[").replace(/[\]]/, "\\\\]");
        //         var regex = new RegExp("[\\\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function loadData() {
    loadPovmonDataset(
        ['indicators_geo2001_2016_04_05_a','indicators_geo2011_2016_04_05_a'],
        'indicator_metadata_2016_04_05',
        'iteration_metadata_2016_04_05',
        makePageElements
    );
}


// And go...
switch ( getParameterFromQueryString( 'level' ) )
{
    case 'local-authority':
    case 'local-authority-and-region':
    case 'region':
        detail_level = DetailLevel.LA;
        jQuery( '#page-title' ).text( 'Local authorities' );
        jQuery('#list-of-links .la').css("display","");
        createMap( '60a322fc-fcad-11e5-8cd2-0e5db1731f59' );
        loadData();
        break;
    case 'lsoa':
        detail_level = DetailLevel.LSOA;
        jQuery( '#page-title' ).text( 'Lower layer super output areas' );
        jQuery('#list-of-links .lsoa').css("display","");
        createMap( 'b7ee5b22-fff9-11e5-b060-0e3ff518bd15' );
        loadData();
        break;
    default:
        jQuery('#map').remove();
        jQuery('#measure-selector').remove();
        jQuery('#wrap .links').remove();
        jQuery('#page-title' ).text( 'Indicator level not found' );
}


