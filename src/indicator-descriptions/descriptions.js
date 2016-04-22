// descriptions.js
// Show the description of a single poverty indicator.


// CONSTANTS
//

ROW_KEY_COLUMN_NAME = 'varname';

SECTION_ROW_KEY = 'Position in the list of indicators';
INDICATOR_NAME_ROW_KEY = 'Indicator'

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



// Convert plain text to html including paragraph structure.
//
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


function getParameterFromQueryString(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      // Lines above are for JS file. Lines below are for ruby string.
      //         name = name.replace(/[\[]/, "\\\\[").replace(/[\]]/, "\\\\]");
      //         var regex = new RegExp("[\\\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}




var indicator_name = getParameterFromQueryString( 'name' );

function inflatePage( indicator_metadata ) {
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
}

// ...and go:
loadCartoDbDataset( 'indicator_metadata_2016_04_05', inflatePage );
