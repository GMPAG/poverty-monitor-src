// all-descriptions.js
// Show a summary of all indicators on a single page.

// CONSTANTS
//
ROW_KEY_COLUMN_NAME = 'varname';

NAME_ROW_KEY = 'Indicator';
SECTION_ROW_KEY = 'Position in the list of indicators';

//
////////////


function inflatePage( indicator_metadata ) {
    console.debug( indicator_metadata );

    var row_keys = indicator_metadata.column( ROW_KEY_COLUMN_NAME );
    var value = function(column, row_key) {
        return column[row_keys.IndexOf(row_key)];
    }

    // Build the shallow tree of sections and summary data.
    var summaries = {}
    for ( key in indicator_metadata.userDefinedColumnNames() ) {
        if ( key == ROW_KEY_COLUMN_NAME ) {
            continue;
        }

        var col = indicator_metadata.column(key);
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
    }

    var addSummary = function(summary) {
        jQuery( '#all-descriptions  > ul' ).append(
            jQuery( '<li>' ).append(
                jQuery( '<h3>' ).text( name ),
                jQuery( '<p>' ).text( summary ),
                jQuery( '<div>' ).append(
                    jQuery( '<span>' ).text( 'See: ' ),
                    jQuery( '<ul>' ).append(
                        jQuery( '<li>' ).append(
                            jQuery( '<a href="/poverty-monitor/indicator-descriptions/?name=' + encodeURIComponent(name) + '">' ).text( 'Full description' )
                        ),
                        jQuery( '<li>' ).append(
                            jQuery( '<a href="/poverty-monitor/indicator-visualisations/?level=local-authority-and-region&measure=' + encodeURIComponent(short_label) + '">' ).text( 'Local authority level information' )
                        )
                    )
                )
            )
        );
    }

    // Build the markup for the summary list.
    jQuery( '#all-descriptions' ).append( jQuery( '<ul>' ) );

    for ( section_name in summaries ) {
        var section = summaries[section_name];

        if ( Array.isArray( section ) ){
            addSection( section_name )

        } else {
            addSummary( section )
        }

    indicator_metadata.forEach( function ( name, index ) {
        var summary = descriptions[1].data[index];
        var short_label =
            la_data.getColumnByProperty( 'descriptionPageTitle', name ).shortLabel;

    } );
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
