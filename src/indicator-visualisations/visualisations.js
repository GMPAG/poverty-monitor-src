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

function createChart( dataset )
{
    var x_axis_id = 'geoname';
    var x_axis_title = 'Local authority';
    var chart_detail_level = DetailLevel.LA;

    function getChartColumns() {
        var keys = dataset.latestIndicatorKeys( detail_level );
        var indicators = keys.map( function(key) {
            return dataset.indicator(key, chart_detail_level);
        });

        var columns = indicators.map( function(indicator) {
            return [ indicator.title ].concat(
                indicator.data.filter(function (value, index) {
//                     return ! geoCodeInRange( DetailLevel.BIG, indicator.geoCodes[index] );
                    return true; // Including all areas. Not refactoring yet.
                })
            );
        });

        // Add the geographical names as the first column.
        columns.unshift( [ x_axis_id ].concat(
            indicators[0].geoNames.filter(function (name, index) {
//                     return ! geoCodeInRange( DetailLevel.BIG, indicators[0].geoCodes[index] );
                return true; // Including all areas. Not refactoring yet.
            })
        ));

        return columns;
    }
    var columns = getChartColumns();

    chart = c3.generate( {
        bindto: '#chart',
        size: {
            height: 400
        },
        data: {
            x: x_axis_id,
            columns: columns,
            type: 'bar',
            // Hide all columns except x and first data column.
            hide: columns.slice(2).map( function(col) {return col[0];} )
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
                    text: columns[1].unitsLabel,
                    position: 'outer-middle'
                }
            }
        },
        legend: {
            show: false
        },
        color: {
            pattern: ['#ddd']
        }
    } );
}

function getMapSql( indicator )
{
    var sql = 'SELECT cartodb_id, geo_name, the_geom, the_geom_webmercator, '
    + indicator.key + " as indicator, '" + indicator.unitsLabel + "' as units FROM "
    + indicator.datasetName + '_with_' + indicator.detailLevel + '_boundaries WHERE the_geom IS NOT NULL';
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

function updateMapForMeasure( indicator )
{
    map.getLayers()[1].getSubLayers()[0].setSQL( getMapSql(indicator) );

    // Remove big things from the data. They will not be shown on the map and
    // should not affect the chloropleth.
    var data = indicator.data.filter( function(val, index) {
        return ! geoCodeInRange( DetailLevel.BIG, indicator.geoCodes[index] );
    });
    var min = Math.min.apply(null, data);
    var max = Math.max.apply(null, data);

    var show_labels = indicator.detailLevel == DetailLevel.LA;
    var inverse_measure = indicator.title == HACK_IMD_TITLE;
//     console.debug( inverse_chloropleth );

    map.getLayers()[1].getSubLayers()[0].setCartoCSS(
        getMapCss(min, max, show_labels, inverse_measure) );

    if ( inverse_measure ) {
        jQuery( '.cartodb-legend-stack .min' ).text( '' );
        jQuery( '.cartodb-legend-stack .max' ).text( '' );
    } else {
        jQuery( '.cartodb-legend-stack .min' ).text( min + indicator.unitsLabel );
        jQuery( '.cartodb-legend-stack .max' ).text( max + indicator.unitsLabel );
    }
}

function updateChartForMeasure( indicator )
{
    chart.hide();
    chart.axis.labels( { y: indicator.unitsLabel } );
    chart.show( indicator.title );
}

//     function selectCategory( category )
//     {
//         jQuery( '#measure-selector .top-level li' ).removeClass( 'active' );
//         jQuery( '#measure-selector .top-level [category="' + category + '"]' ).addClass( 'active' );

//         jQuery( '#measure-selector .second-level ul' ).addClass( 'hidden' );
//         jQuery( '#measure-selector .second-level .' + category ).removeClass( 'hidden' );
//     }

function updateSelectorForMeasure( indicator )
{
    jQuery( '#measure-selector li' ).removeClass( 'active' );
    jQuery( '#measure-selector li[measure="' + indicator.name + '"]' ).addClass( 'active' );
}

function selectIndicator( indicator )
{
    jQuery( '#measure-name' ).text( indicator.title );

    jQuery( '#description-link p' ).remove();
    jQuery( '#description-link' ).append(
        '<p><a href="/poverty-monitor/indicator-descriptions/?name='
        + encodeURIComponent(indicator.title)
        + '">About this indicator</a>.</p>'  );

    updateSelectorForMeasure( indicator );
    if ( chart ) {
        updateChartForMeasure( indicator );
    }
    updateMapForMeasure( indicator );
    drawTable( indicator );
}

//     function onCategoryClicked(e)
//     {
//         selectCategory( jQuery(e.target).attr('category') );
//     }

function onMeasureClicked(e)
{
    selectIndicator(
        povmon_dataset.indicator(
            jQuery(e.currentTarget).attr('measure'), detail_level ) );
}

function createSelector( dataset )
{
    dataset.latestIndicatorKeys(detail_level).forEach( function (key)
                {
                    //             jQuery( '#measure-selector .top-level li' ).click( onCategoryClicked );

//                     var li_class = 'poverty-' + dataset.getIndicatorCategory(key);

                    //             jQuery( '#measure-selector ul.' + li_class + 's' )
                    jQuery( '#measure-selector ul' )
                    .append(
                        jQuery('<li>')
                        .attr( 'measure', key )
                        .click( onMeasureClicked )
//                         .addClass( li_class )
                        .append(
                            jQuery( '<a>' + dataset.getMenuItemLabel(key) + '</a>' )
                        )
                    );
                } );
}

function drawTable ( indicator )
{
    if ( table ) {
        // This fn is in the API docs but console says it does not exist.
        // table.destroy( true );

        jQuery('#table').empty();
    }

    jQuery('#table').append( '<table cellpadding="0" cellspacing="0" border="0" class="display"></table>' );

    var is_displayable = function(x) { return x!=='' && x!==null; };

//     var debug_countdown = 10;

    var config = {
        data : indicator.geoNames.map( function ( geoname, index ) {

            var result = [ geoname, indicator.data[index] ];
//             if ( debug_countdown > 0 ) {
//                 console.debug( result );
//                 debug_countdown -= 1;
//             }
            return result;
        } ),
        columns : [
            { title : "Area" },
            { title : indicator.title }
        ],
        order : [[ 1, "desc" ]]
    };

    if ( indicator.data.length <= 20 ) {
        config.paging = false;                   // Turn off paging
        config.info = false;                     // Turn off paging info
        config.bFilter = false;                  // Turn off search
        config.pageLength = indicator.data.length;  // Remove empty rows

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

// Once the various page elements have been created, set the initial measure
// to be viewed. This may be in the URL. If not, choose a default.
//
function setInitialIndicator() {

    // Does the URL indicate a measure to be shown?
    var indicator_name = getParameterFromQueryString( 'measure' );
    if ( indicator_name ) {

        // TO DO:
        // Currently we are expecting an iteration key in the query string,
        // BUT we are more likely to get an indicator key or an indicator
        // name. We need to add a fn to the PovmonDataset to obtain the
        // latest iteration of a given indicator.

        var iteration_key = povmon_dataset.getLatestIndicatorKeyFromName( indicator_name, detail_level );
        if ( iteration_key ) {
            var indicator = povmon_dataset.indicator( iteration_key, detail_level );
            if ( indicator ) {
                console.debug( ["Initialising with indicator found from query string", iteration_key, indicator] );
                selectIndicator( indicator );
                return;
            }
        }
    }

    // No measure indicated by URL. Use default.
    console.debug( 'No valid indicator ("' + iteration_key + '") found from query string' );
//     console.debug( detail_level );
    selectIndicator( povmon_dataset.indicator(
        povmon_dataset.latestIndicatorKeys(detail_level)[0],
        detail_level
    ));
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

    if ( detail_level == DetailLevel.LA ) {
        createChart( dataset );
    }

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
        ['indicators_geo2001_2016_04_05','indicators_geo2011_2016_04_05'],
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
        jQuery('#list-of-links').append('<li>You can see visualisations of some of these indicators on a <a href="/poverty-monitor/indicator-visualisations?level=lsoa">much smaller scale</a>. (The smaller areas are called "Lower Super Output Areas".)</li>');
        createMap( '60a322fc-fcad-11e5-8cd2-0e5db1731f59' );
        loadData();
        break;
    case 'lsoa':
        detail_level = DetailLevel.LSOA;
        jQuery( '#page-title' ).text( 'Lower layer super output areas' );
        jQuery('#list-of-links').append('<li>You can see visualisations of most indicators at the <a href="/poverty-monitor/indicator-visualisations?level=local-authority-and-region">local authority level</a>.</li>');
        createMap( 'b7ee5b22-fff9-11e5-b060-0e3ff518bd15' );
        loadData();
        break;
    default:
        jQuery('#map').remove();
        jQuery('#measure-selector').remove();
        jQuery('#wrap .links').remove();
        jQuery('#page-title' ).text( 'Indicator level not found' );
}


