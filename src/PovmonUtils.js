//////////////////////////////////////////////////////////////////////////////
// A set of utilities common to all poverty monitor JS files.
//////////////////////////////////////////////////////////////////////////////


// Convert plain text to html including paragraph structure.
// Stole this from somewhere. Probably StackOverflow.
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


// Get a specified parameter from the URL query string.
// Stole this from somewhere. Probably StackOverflow.
function getParameterFromQueryString(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        // Lines above are for JS file. Lines below are for ruby string.
        //         name = name.replace(/[\[]/, "\\\\[").replace(/[\]]/, "\\\\]");
        //         var regex = new RegExp("[\\\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}


// Not all platforms implement a javascript console. Don't break them.
if ( ! console ) {
    console = {
        debug:function(){},
        warn:function(){},
        error:function(){}
    };
}



