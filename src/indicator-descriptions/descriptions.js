//////////////////////////////////////////////////////////////////////////////
// Show the description of a single poverty monitor indicator.
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// CONSTANTS
//

ROW_KEY_COLUMN_NAME = 'varname';

SECTION_ROW_KEY = 'Position in the list of indicators';
INDICATOR_NAME_ROW_KEY = 'Indicator'

// HACK: IMD and child poverty are special cases for link generation.
HACK_IMD_KEY = 'imd_rank';           // only available at lsoa
HACK_CHILD_POVERTY_KEY = 'mpg_2';    // only available at ward

//
//////////////////////////////////////////////////////////////////////////////


function inflatePage( indicator_metadata ) {
    var indicator_name = getParameterFromQueryString( 'name' );
    var column_names = indicator_metadata.userDefinedColumnNames();

    // Get the descriptions text for the current indicator from the appropriate
    // column of the metadata.
    var descriptions = column_names.reduce( function(result, column_name) {
        if ( result ) {
            return result;
        }
        else if ( indicator_metadata.value( 0, column_name ) == indicator_name ) {
            var result = indicator_metadata.column(column_name);
            result.indicatorKey = column_name;
            return result;
        }
        else {
            return null;
        }
    }, null );

    // Bad query string?
    if ( ! descriptions ) {
        // Early exit
        jQuery('#indicator-name').text( "Failed to find requested indicator" );
        return;
    }

    // Helper fn: Is the value for a given row meant to be displayed?
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

        var vis_href;
        if ( descriptions.indicatorKey == HACK_CHILD_POVERTY_KEY ) {
            vis_href = '/poverty-monitor/child-poverty';
        } else {
            var detail_level =
                descriptions.indicatorKey == HACK_IMD_KEY ? 'lsoa' : 'local-authority';
            vis_href = '/poverty-monitor/indicator-visualisations/?level='
            + detail_level + '&measure=' + encodeURIComponent(indicator_name);
        }

        jQuery(this).attr( 'href', vis_href );
    });
}


// ...and go:
loadCartoDbDataset( 'indicator_metadata_2016_04_05', inflatePage );
