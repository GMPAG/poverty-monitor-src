function PovmonDataset( carto_dataset ) {

    ////// Private ///////

    ////// Privileged ///////

//     this.inner = function() {
//         return carto_db_dataset;
//     }

    this.getIndicatorKeys = function() {
        return carto_dataset.userDefinedColumnNames().filter( function ( column_name ) {
            // Some user defined columns are not indicators.
            return [ "geo_code", "geo_name" ].indexOf( column_name.toLowerCase() ) == -1;
        });
    }

    this.getLatestIndicatorKeys = function() {

        var iterations = {};
        this.getIndicatorKeys().forEach( function(v,i,arr) {

            // All keys should be of the form blahblah_XXX where XXX is a 3 digit number
            var frags = v.split(/_(\d{3})$/)

            // When I tested, there was an empty string at the end of the fragments.
            // Get rid of empty strings in case they are implementation-dependent.
            frags = frags.filter(function(v){return v != "";});

            // Do we have the correct number of key fragments?
            if ( frags.length == 2 ) {
                var key_root = frags[0];
                var iteration_id = parseInt(frags[1]);
            }

            // Is the key invalid?
            if ( frags.length != 2  ||  ! isFinite(iteration_index) ) {
                console.error( ["Invalid indicator key!", v, frags, key_root, iteration_id] );
                return null;
            }

            // Create, or add to, an array of iterations for the given key root
            if ( iterations[key_root] ) {
                iterations[key_root].push({key:v, iteration_id:iteration_id});
            } else {
                iterations[key_root] = [{key:v, iteration_id:iteration_id}];
            }
        });
        console.debug(iterations);

        var result = [];
        for ( key_root in key_fragments ) {

            var latest = {iteration_id:-1};

            iterations[key_root].forEach( function(v) {
                if ( v.iteration_id > latest.iteration_id ) {
                    latest = v;
                }
            });

            result.push(latest.key);
        }
        console.debug(result);

        return result;
    }
}


