# A class to render view templates.
#
# I thought about allowing an individual Mustache-derived class per view but
# wasn't sure how to rationalise the template and class system. My solution is
# to have a single Mustache-derived companion class to handle data for all
# views.

require 'mustache'


class View < Mustache

    def render context
        process_context context
        super context
    end

    private

    # Modify the context here, i.e. add everything required for your views.
    #
    # CONVENTION: Examine context[:status] to determine whether this view
    # is being published or previewed (or is targeted at an as-yet-unknown
    # state.)
    #
    def process_context context

        # Add your own data organisation here

        # If you wish, you can examine context[:src_filename] to determine
        # which view you are preparing. Alternatively, you can just give
        # every view an identical context.

        add_content_items_to_collections context

        if context[:src_filename] == './src/indicator-visualisations/index.html.mustache'
            add_viz_styles context
            add_viz_scripts context
        end
        if context[:src_filename] == './src/indicator-descriptions/index.html.mustache'
            add_desc_styles context
            add_desc_scripts context
        end
    end


    # Add collections of content items to the context.
    # One collection per content-type.
    # Only include items accessible in the current context status.
    #
    def add_content_items_to_collections context

        context[:all_metadata].select do |item|
            item[:file_type] == :content  && (
                context[:status] == :preview  ||  item['published'] )
        end.each do | item |
            context[( item['content_type'] + 's').to_sym ] ||= []
            context[( item['content_type'] + 's').to_sym ].push item
        end
    end

    def add_viz_styles context
            context[:styles] = %q@
    <style>

    #measure-name {
        margin-top: 40px;
    }

    #description-link p {
        margin-bottom: 0;
    }

/*
    #measure-selector ul {
        display: block;
        text-align: center;
        background-color: #eee;
    }
    #measure-selector .second-level .hidden {
        display: none;
    }
    #measure-selector .active {
        background-color: #ddd;
    }
    #measure-selector li {
        list-style: none;
        display: inline-block;
        padding: 0 14px;
    }
 */
     #measure-selector li a {
        cursor: pointer;
    }

    #chart-row {
        margin-top: 20px;
        margin-bottom: 2%;
    }

    #chart .c3-axis-x-label {
        font-size: 13px;
    }

    #map {
        height: 600px;

        /* Can't set a min-height (rather than a height) for the map.
           When I tried this, the map overflowed and covered the footer.
        min-height: 600px;*/
    }

    #table .region td {
        background-color: #eef;
    }

    #wrap .links {
        margin-top: 40px;
    }

    </style>
@
    end

    def add_viz_scripts context
        context[:scripts] = %q@
    <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/c3/0.4.10/c3.js"></script>
    <script src="http://libs.cartocdn.com/cartodb.js/v3/3.13/cartodb.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.7/js/jquery.dataTables.min.js"></script>
    <script src="../CartoDbDataLoader.js"></script>


    <script>

    var columnsList = null;
    var x_axis_name = 'areaname';
    var chart = null;
    var map = null;
    var table = null;
    var dataset_name = null;
    var page_ready_for_measure_selection = false;

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

    function updateMapForMeasure( column )
    {
        var show_labels = column.data.length < 15 ? true : false;

        map.getLayers()[1].getSubLayers()[0].setSQL( getMapSql(column) );
        map.getLayers()[1].getSubLayers()[0].setCartoCSS( getMapCss(column.min(), column.max(), show_labels) );

        jQuery( '.cartodb-legend-stack .min' ).text( column.min()+column.unitsLabel );
        jQuery( '.cartodb-legend-stack .max' ).text( column.max()+column.unitsLabel );
    }

    function updateChartForMeasure( column )
    {
        chart.hide();
        chart.axis.labels( { y: column.unitsLabel } );
        chart.show( column.label );
    }

    function selectCategory( category )
    {
//         jQuery( '#measure-selector .top-level li' ).removeClass( 'active' );
//         jQuery( '#measure-selector .top-level [category="' + category + '"]' ).addClass( 'active' );

//         jQuery( '#measure-selector .second-level ul' ).addClass( 'hidden' );
//         jQuery( '#measure-selector .second-level .' + category ).removeClass( 'hidden' );
    }

    function updateSelectorForMeasure( column )
    {
        jQuery( '#measure-selector li' ).removeClass( 'active' );
        jQuery( '#measure-selector li[measure="' + column.name + '"]' ).addClass( 'active' );
    }

    function selectMeasure( column )
    {
        jQuery( '#measure-name' ).text( column.label );

        jQuery( '#description-link p' ).remove();
        jQuery( '#description-link' ).append(
            '<p>Read an <a href="/poverty-monitor/indicator-descriptions/?name='
            + encodeURIComponent(column.descriptionPageTitle)
            + '">explanation of this indicator</a>.</p>'  );

        updateSelectorForMeasure( column );
        if ( chart ) {
            updateChartForMeasure( column );
        }
        updateMapForMeasure( column );
        drawTable( columnsList.getColumnByName( x_axis_name ), column );
    }

    function onCategoryClicked(e)
    {
        selectCategory( jQuery(e.target).attr('category') );
    }

    function onMeasureClicked(e)
    {
        selectMeasure(
            columnsList.getColumnByName(
                jQuery(e.currentTarget).attr('measure') ) );
    }

    function createSelector( columns )
    {
        columns.filter( function ( column ) {
            return column.y_axis;
        } ).forEach( function (column)
        {
//             jQuery( '#measure-selector .top-level li' ).click( onCategoryClicked );

            var li_class = 'poverty-' + column.category;

//             jQuery( '#measure-selector ul.' + li_class + 's' )
            jQuery( '#measure-selector ul' )
            .append(
                jQuery('<li>')
                .attr( 'measure', column.name )
                .click( onMeasureClicked )
                .addClass( li_class )
                .append(
                    jQuery( '<a>' + column.shortLabel + '</a>' )
                )
            );
        } );
    }

    function drawTable ( areanames, column )
    {
        if ( table ) {
            // This fn is in the API docs but console says it does not exist.
            // table.destroy( true );

            jQuery('#table').empty();
        }

        jQuery('#table').append( '<table cellpadding="0" cellspacing="0" border="0" class="display"></table>' );

        var is_displayable = function(x) { return x!=='' && x!==null; };

        var config = {
            data : areanames.data.map( function ( areaname, index ) {
                return [
                    areaname,
                    // column.data[index] ? column.data[index]+column.unitsLabel : ''
                    is_displayable(column.data[index]) ? column.data[index]+column.unitsLabel : ''
                ];
            } ),
            columns : [
                { title : "Local authority" },
                { title : column.label }
            ],
            order : [[ 1, "desc" ]]
        };

        if ( column.data.length <= 20 ) {
            config.paging = false;                   // Turn off paging
            config.info = false;                     // Turn off paging info
            config.bFilter = false;                  // Turn off search
            config.pageLength = column.data.length;  // Remove empty rows

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


    function makePageElements( columns )
    {
        columnsList = columns;
        columnsList.getColumnByName = function( column_name )
        {
            return this.filter( function ( column ) {
                return column.name == column_name;
            } )[0];
        }

        createSelector( columns );

        if ( columns[0].data.length < 15 ) {
            createChart( columns );
        }

        // HACK: Asynchrous creation of map and other page elements means that
        // they could become ready in either order. Initial measure selection
        // only happens in one of two places, so a simple boolean flag is
        // enough to tell us when to try selecting the initial measure.
        if ( page_ready_for_measure_selection ) {
            selectMeasure( columns[1] );
            selectCategory( 'poverty-' + columns[1].category + 's' );
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
                selectMeasure( columnsList[1] );
                selectCategory( 'poverty-' + columnsList[1].category + 's' );
            }
            else {
                page_ready_for_measure_selection = true;
            }
        } );
    }


    function getParameterFromQueryString(name) {
//        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
//        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
// Lines above are for JS file. Lines below are for ruby string.
        name = name.replace(/[\[]/, "\\\\[").replace(/[\]]/, "\\\\]");
        var regex = new RegExp("[\\\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }


    // And go...

    switch ( getParameterFromQueryString( 'level' ) )
    {
        case 'local-authority':
            dataset_name = 'localauthoritymultiindicator';
            CartoDbDataLoader.gimme( dataset_name, makePageElements );
            jQuery( '#page-title' ).text( 'Local authorities' );
            createMap( '6d084fac-ef4a-11e4-96e6-0e0c41326911' );
            jQuery('#list-of-links').append('<li>You can see visualisations of some of these indicators on a <a href="/poverty-monitor/indicator-visualisations?level=lsoa">much smaller scale</a>. (The smaller areas are called "Lower Super Output Areas".)</li>');
            break;
        case 'local-authority-and-region':
            dataset_name = 'localauthoritymultiindicator_rg';
            CartoDbDataLoader.gimme( dataset_name, makePageElements );
            jQuery( '#page-title' ).text( 'Local authorities' );
            createMap( '6d084fac-ef4a-11e4-96e6-0e0c41326911' );
            jQuery('#list-of-links').append('<li>You can see visualisations of some of these indicators on a <a href="/poverty-monitor/indicator-visualisations?level=lsoa">much smaller scale</a>. (The smaller areas are called "Lower Super Output Areas".)</li>');
            break;
        case 'region':
            dataset_name = 'regionalmultiindicator';
            CartoDbDataLoader.gimme( dataset_name, makePageElements );
            jQuery( '#page-title' ).text( 'Regions' );
            jQuery('#map').remove();
            jQuery('#list-of-links').append('<li>You can see visualisations of all indicators at the <a href="/poverty-monitor/indicator-visualisations?level=local-authority-and-region">local authority level</a>.</li>');
            jQuery('#list-of-links').append('<li>You can see visualisations of some of these indicators on a <a href="/poverty-monitor/indicator-visualisations?level=lsoa">much smaller scale</a>. (The smaller areas are called "Lower Super Output Areas".)</li>');
            break;
        case 'lsoa':
            dataset_name = 'lsoamultiindicator';
            CartoDbDataLoader.gimme( dataset_name, makePageElements );
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


    </script>
@
    end

    def add_desc_styles context
    end

    def add_desc_scripts context
        context[:scripts] = %q@
    <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script src="../GoogleDataLoader.js"></script>


    <script>

    var indicator_name = null;

    function paragraphise(s) {

        var result =
        '<p>'
        +
        s
        .split(/(\n\n|\r\n\r\n)/)          // break in to prargraphs
        .filter( function(para) {          // kill whitespace-only paragraphs
            return ! para.match( /^\s*$/ );
        } )
        .map( function (para) {            // replace remaining breaks with html
            return para.trim().replace( "/(\n|\r\n)/", "<br />" );
        } )
        .join("</p><p>")                   // glue paras back together with html
        +
        "</p>";

        // console.debug( result );

        return result;
    }

    function setIndicatorDescriptionText( description_fields )
    {
        console.debug( description_fields );

        for ( var key in description_fields ) {
            if( description_fields.hasOwnProperty( key ) ) {

                if ( key == "indicator-name" ) {
                    jQuery("#indicator-name").text(description_fields["indicator-name"]);
                }
                else if ( typeof key == 'string'  &&  key.length > 0 ) {
                    console.debug( key );
                    jQuery("#indicator-description ." + key).replaceWith(paragraphise(description_fields[key]));
                }
            }
        }
    }

    function inflatePage( indicator_descriptions )
    {
        indicator_descriptions.getRow = function ( page_title ) {

            var rx = this[0].data.reduce( function ( found_index, row_title, current_index ) {

                if ( found_index !== null ) {
                    return found_index;
                }
                else if ( row_title == page_title ) {
                    return current_index;
                }
                else {
                    return null;
                }
            }, null );

            if ( rx == -1 ) {
                return null;
            }
            else
            {
                return this.reduce( function( row, col ) {
                    row[col.label] = col.data[rx];
                    return row;
                }, {} );
            }
        }

        setIndicatorDescriptionText( indicator_descriptions.getRow( indicator_name ) );
    }


    function getParameterFromQueryString(name) {
//        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
//        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
// Lines above are for JS file. Lines below are for ruby string.
        name = name.replace(/[\[]/, "\\\\[").replace(/[\]]/, "\\\\]");
        var regex = new RegExp("[\\\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }


    // And go...

    indicator_name = getParameterFromQueryString( 'name' );
    GoogleDataLoader.gimme( "https://docs.google.com/spreadsheets/d/1_3gRhw7tOwXxYvAjYtqZATL6xfaET9mAFUQpNt_OegQ/gviz/tq", inflatePage );
    </script>
@
            end
end
