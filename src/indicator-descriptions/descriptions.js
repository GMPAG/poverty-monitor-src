// descriptions.js
// Show the description of a single poverty indicator.


// CONSTANTS
//

ROW_KEY_COLUMN_NAME = 'varname';

SECTION_ROW_KEY = 'Position in the list of indicators';

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
    var headings = indicator_metadata.column( ROW_KEY_COLUMN_NAME );
    var column_names = indicator_metadata.userDefinedColumnNames();

    var descriptions = column_names.reduce( function(result, name) {
        if ( result ) {
            return result;
        }
        else if ( indicator_metadata.value( 0, name ) == indicator_name ) {
            console.debug("Win!");
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

    jQuery('#indicator-name').text( descriptions[0] );

    for ( var i = 1; i < descriptions.length; i++ ) {

        if ( headings[i] == '' || headings[i] == SECTION_ROW_KEY ) {
            continue;
        }

        jQuery('#indicator-description').append(
            jQuery('<h2>').text(headings[i]),
            jQuery('<div>').append(paragraphise(descriptions[i]))
        );
    }
}

// ...and go:
loadCartoDbDataset( 'indicator_metadata_2016_04_05', inflatePage );
