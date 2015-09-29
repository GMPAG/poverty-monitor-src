// all-descriptions.js
// Show a summary of all indicators on a single page.

function inflatePage( all_data ) {
    console.debug( all_data );
    var descriptions = all_data['descriptions'];
    var la_data = all_data['local_authority_data'];

    if ( descriptions ) {

        console.debug( descriptions );

        jQuery( '#all-descriptions' ).append( jQuery( '<ul>' ) );

        descriptions[0].data.forEach( function ( name, index ) {
            var summary = descriptions[1].data[index];
            var short_label =
                la_data.getColumnByProperty( 'descriptionPageTitle', name ).shortLabel;

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
        } );
    }
    else {
        jQuery( '#all-descriptions' ).append(
            jQuery( '<p>' ).text(
                'We are sorry. Something went wrong. We were unable to load the descriptions of the poverty index indicators.'
            )
        );
    }
}

function getCallbackCreator( number_of_data_callbacks, final_callback ) {

    var all_data = {}

    return function ( data_key ) {

        return function( data_value ) {
            all_data[data_key] = data_value;

            if ( Object.keys(all_data).length == number_of_data_callbacks ) {
                final_callback( all_data );
            }
        }
    }
}


var getCallback = getCallbackCreator( 2, inflatePage );

GoogleDataLoader.gimme(
    "https://docs.google.com/spreadsheets/d/1_3gRhw7tOwXxYvAjYtqZATL6xfaET9mAFUQpNt_OegQ/gviz/tq",
    getCallback( 'descriptions' )
);
CartoDbDataLoader.gimme( 'localauthoritymultiindicator_rg', 'areaname', getCallback( 'local_authority_data' ) );
