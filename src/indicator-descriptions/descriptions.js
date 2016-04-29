//////////////////////////////////////////////////////////////////////////////
// Show the description of a single poverty monitor indicator.
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// CONSTANTS
//

ROW_KEY_COLUMN_NAME = 'varname';

SECTION_ROW_KEY = 'Position in the list of indicators';
INDICATOR_NAME_ROW_KEY = 'Indicator'

// HACK: The IMD is a special case because severity / numerical value are
// inversely related and it is not available at a local authority level.
HACK_IMD_NAME = 'Indices of Multiple Deprivation (IMD)';

//
//////////////////////////////////////////////////////////////////////////////


function inflatePage( indicator_metadata ) {
    var indicator_name = getParameterFromQueryString( 'name' );
    var column_names = indicator_metadata.userDefinedColumnNames();

    // Get the descriptions text for the current indicator from the appropriate
    // column of the metadata.
    var descriptions = column_names.reduce( function(result, name) {
        if ( result ) {
            return result;
        }
        else if ( indicator_metadata.value( 0, name ) == indicator_name ) {
            return indicator_metadata.column(name);
        }
        else {
            return null;
        }
    }, null );


    if ( ! descriptions ) {
        jQuery('#indicator-name').text( "Failed to find requested indicator" );
        return;
    }

    var isForDisplay = function(row_heading) {
        return row_heading != '' &&
            row_heading != SECTION_ROW_KEY &&
            // Assume an all-upper-case row heading is for use elsewhere.
            row_heading != row_heading.toUpperCase();
    }

    // Add the various description elements to the web page.
    var row_headings = indicator_metadata.column( ROW_KEY_COLUMN_NAME );
    row_headings.forEach( function ( heading, i ) {
        var description = descriptions[i];

        if ( isForDisplay(heading) && description != "" ) {
            if ( heading == INDICATOR_NAME_ROW_KEY ) {
                jQuery('#indicator-name').text( description );
            }
            else {
                jQuery('#indicator-description').append(
                    jQuery('<h2>').text(heading),
                    jQuery('<div>').append(paragraphise(description))
                );
            }
        }
    });

    // Modify the link to the indicator visualisation.
    jQuery( '#indicator-details > .links a' ).each( function () {
        var detail_level =
            indicator_name == HACK_IMD_NAME ? 'lsoa' : 'local-authority';
        jQuery(this).attr( 'href',
                          jQuery(this).attr('href')
                          + '?measure=' + encodeURIComponent( indicator_name )
                          + '&level=' + encodeURIComponent( detail_level )
        );
    });
}


// ...and go:
loadCartoDbDataset( 'indicator_metadata_2016_04_05', inflatePage );
