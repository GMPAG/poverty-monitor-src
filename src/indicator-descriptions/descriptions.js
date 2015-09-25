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
       name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
       var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
// Lines above are for JS file. Lines below are for ruby string.
//         name = name.replace(/[\[]/, "\\\\[").replace(/[\]]/, "\\\\]");
//         var regex = new RegExp("[\\\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }


    // And go...

    indicator_name = getParameterFromQueryString( 'name' );
    GoogleDataLoader.gimme( "https://docs.google.com/spreadsheets/d/1_3gRhw7tOwXxYvAjYtqZATL6xfaET9mAFUQpNt_OegQ/gviz/tq", inflatePage );
