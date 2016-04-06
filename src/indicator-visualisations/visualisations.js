var allIndicators = null;
var x_axis_name = 'areaname';
var chart = null;
var map = null;
var table = null;
var dataset_name = null;
var page_ready_for_measure_selection = false;
var povmon_iteration = "April 2016"

function createChart( columns )
{
    function getChartColumn( column ) {
        var result = column.data.slice();
        if ( column.x_axis ) {
            result.unshift( x_axis_name );
        }
        else {
            result.unshift( column.label );
        }
        return result;
    }

    function getChartColumns() {
        return columns.map( function ( col ) {
            return getChartColumn( col );
        } );
    }

    var chart_columns = getChartColumns();

    chart = c3.generate( {
        bindto: '#chart',
        size: {
            height: 400
        },
        data: {
            x: x_axis_name,
            columns: chart_columns,
            type: 'bar',
            // Hide all columns except the first.
            hide: chart_columns.slice(2).map( function(col) {return col[0];} )
        },
        axis: {
            x: {
                type: 'category',
                label: {
                    text: 'Local Authority',
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

function getMapSql( column )
{
    return 'SELECT cartodb_id, ' + x_axis_name + ', the_geom, the_geom_webmercator, '
    + column.name + " as indicator, '" + column.unitsLabel + "'as units FROM " + dataset_name + '_withboundaries';
}

function getColourRampCss( colour, value )
{
    return '\n\
#localauthoritymultiindicator_withboundaries [ indicator <= ' + value + '] {  \n\
polygon-fill: ' + colour + ';  \n\
}';
}

function getMapCss( min_val, max_val, show_labels )
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
text-fill: #333333;   \n\
text-halo-fill: #ffdd88;   \n\
text-halo-radius: 2;   \n\
text-dy: -10;   \n\
text-allow-overlap: true;   \n\
text-placement: point;   \n\
text-placement-type: simple;   \n\
}   \n\
";
}

    var colours =
        [ '#B10026', '#E31A1C', '#FC4E2A', '#FD8D3C', '#FEB24C', '#FED976', '#FFFFB2' ];

    var val = max_val;
    var increment = ( max_val - min_val ) / colours.length;

    colours.forEach( function ( colour ) {
        result += getColourRampCss( colour, val );
        val -= increment;
    } );

    return result;
}

function updateMapForMeasure( indicator )
{
    var show_labels = allIndicators.numRows() < 15 ? true : false;

    map.getLayers()[1].getSubLayers()[0].setSQL( getMapSql(indicator) );
    map.getLayers()[1].getSubLayers()[0].setCartoCSS( getMapCss(indicator.min(), indicator.max(), show_labels) );

    jQuery( '.cartodb-legend-stack .min' ).text( indicator.min()+indicator.unitsLabel );
    jQuery( '.cartodb-legend-stack .max' ).text( indicator.max()+indicator.unitsLabel );
}

function updateChartForMeasure( indicator )
{
    chart.hide();
    chart.axis.labels( { y: indicator.unitsLabel } );
    chart.show( indicator.label );
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
    jQuery( '#measure-name' ).text( indicator.label );

    jQuery( '#description-link p' ).remove();
    jQuery( '#description-link' ).append(
        '<p>Read an <a href="/poverty-monitor/indicator-descriptions/?name='
        + encodeURIComponent(indicator.descriptionPageTitle)
        + '">explanation of this indicator</a>.</p>'  );

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
        allIndicators.indicator(
            jQuery(e.currentTarget).attr('measure') ) );
}

function createSelector( dataset )
{
    dataset.latestIndicatorKeys().forEach( function (key)
                {
                    //             jQuery( '#measure-selector .top-level li' ).click( onCategoryClicked );

                    var li_class = 'poverty-' + dataset.getIndicatorCategory(key);

                    //             jQuery( '#measure-selector ul.' + li_class + 's' )
                    jQuery( '#measure-selector ul' )
                    .append(
                        jQuery('<li>')
                        .attr( 'measure', dataset.getIndicatorName(key) )
                        .click( onMeasureClicked )
                        .addClass( li_class )
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
            var result = [
                geoname,
                // indicator.data[index] ? indicator.data[index]+indicator.unitsLabel : ''
                is_displayable(indicator.data[index]) ? ""+indicator.data[index]+indicator.unitsLabel : ''
            ];
//             if ( debug_countdown > 0 ) {
//                 console.debug( result );
//                 debug_countdown -= 1;
//             }
            return result;
        } ),
        columns : [
            { title : "Local authority" },
            { title : indicator.label }
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
    var indicator_id = getParameterFromQueryString( 'measure' );
    if ( indicator_id ) {
        var indicator = allIndicators.indicator( indicator_id );
        if ( indicator ) {
            console.debug( ["Initialising with indicator found from query string", indicator_id, indicator] );
            selectIndicator( indicator );
            return;
        }
    }

    // No measure indicated by URL. Use default.
    console.debug( "No indicator found from query string" );
    selectIndicator( allIndicators.indicator( allIndicators.latestIndicatorKeys()[0] ) );
}

function makePageElements( dataset )
{
    allIndicators = dataset;

    createSelector( dataset );

    if ( dataset.numRows() < 15 ) {
        createChart( dataset );
    }

    // HACK: Asynchrous creation of map and other page elements means that
    // they could become ready in either order. Initial measure selection
    // only happens in one of two places, so a simple boolean flag is
    // enough to tell us when to try selecting the initial measure.
    if ( page_ready_for_measure_selection ) {
        setInitialIndicator();
        //             selectCategory( 'poverty-' + columns[1].category + 's' );
    }
    else {
        page_ready_for_measure_selection = true;
    }
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

        // HACK: Asynchrous creation of map and other page elements means that
        // they could become ready in either order. Initial measure selection
        // only happens in one of two places, so a simple boolean flag is
        // enough to tell us when to try selecting the initial measure.
        if ( page_ready_for_measure_selection ) {
            setInitialIndicator();
            //                 selectCategory( 'poverty-' + allIndicators[1].category + 's' );
        }
        else {
            page_ready_for_measure_selection = true;
        }
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


// And go...

switch ( getParameterFromQueryString( 'level' ) )
{
    case 'local-authority':
        dataset_name = 'localauthoritymultiindicator';
        CartoDbDataLoader.gimme( dataset_name, x_axis_name, makePageElements );
        jQuery( '#page-title' ).text( 'Local authorities' );
        createMap( '6d084fac-ef4a-11e4-96e6-0e0c41326911' );
        jQuery('#list-of-links').append('<li>You can see visualisations of some of these indicators on a <a href="/poverty-monitor/indicator-visualisations?level=lsoa">much smaller scale</a>. (The smaller areas are called "Lower Super Output Areas".)</li>');
        break;
    case 'local-authority-and-region':
        dataset_name = 'localauthoritymultiindicator_rg';
        CartoDbDataLoader.gimme( dataset_name, x_axis_name, makePageElements );
        jQuery( '#page-title' ).text( 'Local authorities' );
        createMap( '6d084fac-ef4a-11e4-96e6-0e0c41326911' );
        jQuery('#list-of-links').append('<li>You can see visualisations of some of these indicators on a <a href="/poverty-monitor/indicator-visualisations?level=lsoa">much smaller scale</a>. (The smaller areas are called "Lower Super Output Areas".)</li>');
        break;
    case 'region':
        dataset_name = 'regionalmultiindicator';
        CartoDbDataLoader.gimme( dataset_name, x_axis_name, makePageElements );
        jQuery( '#page-title' ).text( 'Regions' );
        jQuery('#map').remove();
        jQuery('#list-of-links').append('<li>You can see visualisations of all indicators at the <a href="/poverty-monitor/indicator-visualisations?level=local-authority-and-region">local authority level</a>.</li>');
        jQuery('#list-of-links').append('<li>You can see visualisations of some of these indicators on a <a href="/poverty-monitor/indicator-visualisations?level=lsoa">much smaller scale</a>. (The smaller areas are called "Lower Super Output Areas".)</li>');
        break;
    case 'lsoa':
        dataset_name = 'lsoamultiindicator';
        loadCartoDbDataset(
            'indicators_geo2001_2016_04_05',
            null,
            null,
//             'lsoamultiindicator_columnmetadata2',
//             'indicator_property',
//             function(dataset){console.debug(dataset);}
            function(carto_dataset){ makePageElements( new PovmonDataset(carto_dataset)); }
//             makePageElements
        );
//         CartoDbDataLoader.gimme( dataset_name, x_axis_name, makePageElements );
        jQuery( '#page-title' ).text( 'Lower layer super output areas' );
        //             jQuery( '#measure-selector .btn-group' )[1].remove();
        createMap( 'a5053f5c-05f0-11e5-822d-0e4fddd5de28' );
        jQuery('#list-of-links').append('<li>You can see visualisations of all indicators at the <a href="/poverty-monitor/indicator-visualisations?level=local-authority-and-region">local authority level</a>.</li>');
        break;
    default:
        jQuery('#map').remove();
        jQuery('#measure-selector').remove();
        jQuery('#wrap .links').remove();
        jQuery('#page-title' ).text( 'Indicator level not found' );
}
