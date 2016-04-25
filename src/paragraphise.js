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


