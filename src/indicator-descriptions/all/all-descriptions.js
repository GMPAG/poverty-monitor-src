// all-descriptions.js
// Show a summary of all indicators on a single page.

// CONSTANTS
//

ROW_KEY_COLUMN_NAME = 'varname';

NAME_ROW_KEY = 'Indicator';
SECTION_ROW_KEY = 'Position in the list of indicators';
DESCRIPTION_ROW_KEY = 'What is this indicator?';

// A HACK to get sections in the order that Ruth Lupton wants them.
// Replace this with some kind of ordering metadata in the canonical
// spreadsheet.
HACK_SECTION_ORDER = [
    'Indices of Multiple Deprivation (IMD)',
    'Child Poverty',
    'Unemployment',
    'Claims for Other Out of Work Benefits',
    'Claims for In-Work Benefits',
    'Housing Unaffordability',
    'Other Indicators'
];

// HACK: The IMD is a special case because severity / numerical value are
// inversely related and it is not available at a local authority level.
HACK_IMD_NAME = 'Indices of Multiple Deprivation (IMD)';

//
////////////


// Not all platforms implement a javascript console.
if ( ! console ) {
    console = {
        debug:function(){},
        warn:function(){},
        error:function(){}
    };
}



function inflatePage( indicator_metadata ) {
//     console.debug( indicator_metadata );

    var row_keys = indicator_metadata.column( ROW_KEY_COLUMN_NAME );
    var value = function(column, row_key) {
        return column[row_keys.indexOf(row_key)];
    }
    var summary = function(key, col) {
        var result = {
            key: key,
            name: value(col,NAME_ROW_KEY),
            description: value(col,DESCRIPTION_ROW_KEY)
        }
//         console.debug( result );
        return result;
    }

    // Build the shallow tree of sections and summary data.
    var summaries = {}
    indicator_metadata.userDefinedColumnNames().forEach( function(key) {

        if ( key == ROW_KEY_COLUMN_NAME ) {
            return;
        }

        var col = indicator_metadata.column(key);
        if ( ! col ) {
            console.error( "Failed to retrieve column " + key );
            return;
        }

        var section = value(col,SECTION_ROW_KEY);

        if ( section == '' ) {
            var name = value(col,NAME_ROW_KEY);
            summaries[name] = summary(key,col);
        } else {
            if ( ! summaries.hasOwnProperty(section) ) {
                summaries[section] = [];
            }
            summaries[section].push( summary(key, col) );
        }
    });

    // Append a section to the list of sections.
    var addSection = function(name) {
        jQuery( '#all-descriptions  > ul' ).append(
            jQuery( '<li>' ).append(
                jQuery( '<h2>' ).text( name ),
                jQuery( '<ul>' )
            )
        );
    }

    // Append a summary to the final section.
    var addSummary = function(summary, with_title) {

        jQuery( '#all-descriptions > ul > li > ul' ).last().append(
            jQuery('<li>')
        );

        if ( with_title ) {
            jQuery( '#all-descriptions > ul > li > ul > li' ).last().append(
                jQuery( '<h3>' ).text( summary.name )
            );
        }

        var detail_level =
            summary.name == HACK_IMD_NAME ? 'lsoa' : 'local-authority';

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
                        jQuery(
                            '<a href="/poverty-monitor/indicator-visualisations/?level='
                            + detail_level + '&measure=' + encodeURIComponent(summary.name) + '">'
                        ).text( 'What the data shows' )
                    )
                )
            )
        );
    }


    // Are the section names the ones that we already know about?
    // (See the CONSTANTS block at the top of this file.)
    var section_names = Object.keys(summaries);

    function arrayContentsAreIdentical( a1, a2 ) {

        if ( a1.length != a2.length ) {
            return false;
        }

        // Make sure that none of the values in a1 are missing from a2.
        // ASSUMPTION: No value will occur multiple times in either array.
        var isMissingSection = a1.some( function( a1val ) {
            return ( -1 == a2.indexOf(a1val) );
        });

        return ! isMissingSection;
    }

    if ( arrayContentsAreIdentical( section_names, HACK_SECTION_ORDER ) ) {
        // Only the section names we are already aware of are present, so use
        // our HACKED in order for sections.
        section_names = HACK_SECTION_ORDER;
    } else {
        console.warn(
            'The section names as defined by row key "' + SECTION_ROW_KEY +
            '" have changed, so we are not imposing any kind of order on the sections.'
            + 'This is probably not what you want.' );
        console.warn( [section_names, HACK_SECTION_ORDER ] );
    }

    // Start the markup for the summary list.
    jQuery( '#all-descriptions' ).append( jQuery( '<ul>' ) );

    section_names.forEach( function ( section_name ) {

        addSection( section_name );

        var section = summaries[section_name];
        if ( Array.isArray( section ) ){
            section.forEach( function( summary ) { addSummary( summary, true ); } );
        } else {
            addSummary( section, false );
        }
    });

    //         indicator_metadata.forEach( function ( name, index ) {
    //             var summary = descriptions[1].data[index];
    //             var short_label =
    //                 la_data.getColumnByProperty( 'descriptionPageTitle', name ).shortLabel;
    //         } );
    //     }
    //     else {
    //         jQuery( '#all-descriptions' ).append(
    //             jQuery( '<p>' ).text(
    //                 'We are sorry. Something went wrong. We were unable to load the descriptions of the poverty index indicators.'
    //             )
    //         );
    //     }

}

// ...and go!
loadCartoDbDataset( 'indicator_metadata_2016_04_05', inflatePage );
