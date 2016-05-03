//////////////////////////////////////////////////////////////////////////////
// Show a summary of all available poverty monitor indicators.
//////////////////////////////////////////////////////////////////////////////


// CONSTANTS
//

ROW_KEY_COLUMN_NAME = 'varname';

NAME_ROW_KEY = 'Indicator';
SECTION_ROW_KEY = 'Position in the list of indicators';
DESCRIPTION_ROW_KEY = 'What is this indicator?';
ORDER_ROW_KEY = 'DISPLAY_ORDER';

// HACK: IMD and child poverty are special cases for link generation.
HACK_IMD_KEY = 'imd_rank';           // only available at lsoa
HACK_CHILD_POVERTY_KEY = 'mpg_2';    // only available at ward

//
////////////


function inflatePage( indicator_metadata ) {

    // Helper fn: Get a metadata value from indicator_key and row_key.
    var value = function(indicator_key, row_key) {
        var row_keys = indicator_metadata.column( ROW_KEY_COLUMN_NAME );
        return indicator_metadata.column(indicator_key)[row_keys.indexOf(row_key)];
    }

    // Helper fn: Get an indicator summary from the indicator's key.
    var indicatorSummary = function(indicator_key) {
        var result = {
            key: indicator_key,
            name: value(indicator_key,NAME_ROW_KEY),
            description: value(indicator_key,DESCRIPTION_ROW_KEY),
            sectionName: value(indicator_key,SECTION_ROW_KEY),
            displayOrder: parseInt(value(indicator_key,ORDER_ROW_KEY), 10)
        }
//         console.debug( result );
        return result;
    }

    // Helper fn
    var findSectionByName = function(sections,section_name) {
        for ( var i=0; i<sections.length; i++) {
            if ( sections[i].name == section_name ) {
                return sections[i];
            }
        }
        return null;
    }

    // Helper fn: Append markup for a new section.
    var addSectionMarkup = function(section_name) {
        jQuery( '#all-descriptions  > ul' ).append(
            jQuery( '<li>' ).append(
                jQuery( '<h2>' ).text( section_name ),
                jQuery( '<ul>' )
            )
        );
    }

    // Helper fn: Append markup for a new indicator-summary, to the most
    //            recently added section.
    var addIndicatorSummaryMarkup = function(summary, with_title) {

        jQuery( '#all-descriptions > ul > li > ul' ).last().append(
            jQuery('<li>')
        );

        if ( with_title ) {
            jQuery( '#all-descriptions > ul > li > ul > li' ).last().append(
                jQuery( '<h3>' ).text( summary.name )
            );
        }

        var vis_href;
        if ( summary.key == HACK_CHILD_POVERTY_KEY ) {
            vis_href = '/poverty-monitor/child-poverty';
        } else {
            var detail_level =
                summary.key == HACK_IMD_KEY ? 'lsoa' : 'local-authority';
            vis_href = '/poverty-monitor/indicator-visualisations/?level='
            + detail_level + '&measure=' + encodeURIComponent(summary.name);
        }

        jQuery( '#all-descriptions > ul > li > ul > li' ).last().append(
            jQuery( '<p>' ).text( summary.description ),
            jQuery( '<div>' ).append(
                jQuery( '<span>' ).text( 'See: ' ),
                jQuery( '<ul>' ).append(
                    jQuery( '<li>' ).append(
                        jQuery(
                            '<a href="/poverty-monitor/indicator-descriptions/?name='
                            + encodeURIComponent(summary.name) + '">'
                        ).text( 'About this indicator' )
                    ),
                    jQuery( '<li>' ).append(
                        jQuery( '<a href="' + vis_href + '">' ).text( 'What the data shows' )
                    )
                )
            )
        );
    }

    // Get the list of indicators in display order.
    var indicators = indicator_metadata.userDefinedColumnNames()
    .filter( function(key) { return key != ROW_KEY_COLUMN_NAME; } )
    .map( function(key) { return indicatorSummary(key); } )
    .sort( function(a,b) { return a.displayOrder - b.displayOrder; } )
    ;
//     console.debug(indicators);

    // Derive the list of sections from the list of indicators.
    var sections = indicators.reduce( function(result,indicator) {
        var section_name = indicator.sectionName || indicator.name;
        var section = findSectionByName(result, section_name);
        if ( section ) {
            section.indicators.push(indicator);
        } else {
            result.push( {name:section_name,indicators:[indicator]} );
        }
        return result;
    }, [] );
//     console.debug(sections);


    // Add the markup for the outermost list. (The section list.)
    jQuery( '#all-descriptions' ).append( jQuery( '<ul>' ) );

    // Add the markup for each section and its list of indicators.
    sections.forEach( function ( section ) {

        var summary_titles_required =
            section.indicators.length > 1 ||
            section.name != section.indicators[0].name

        addSectionMarkup( section.name );
        section.indicators.forEach( function( summary ) {
            addIndicatorSummaryMarkup( summary, summary_titles_required );
        } );
    });
}


// ...and go!
loadCartoDbDataset( 'indicator_metadata_2016_04_05', inflatePage );
