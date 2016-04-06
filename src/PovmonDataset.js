function PovmonDataset( carto_dataset ) {

    ////// Private ///////

    // Give private functions and inner functions access to this.
    var that = this;

    // Not calculating latestIndicatorKeys immediately, because doing so
    // requires access to member functions that are not yet defined.
    var latestIndicatorKeys = null;

    var getLatestIndicatorKeys = function() {

        var iterations = {};
        that.allIndicatorKeys().forEach( function(key) {

            if ( isEmptyIteration(key) ) {
                // Don't consider using this iteration of the indicator. It has no data.
                return;
            }

            var frags = getKeyFragments(key);

            // Is the key invalid?
            if ( ! frags  ||  ! isFinite(frags.iteration_id) ) {
                console.error( ["Invalid indicator key!", key, frags] );
                return;
            }

            // Create, or add to, an array of iterations for the given key root
            if ( iterations[frags.key_root] ) {
                iterations[frags.key_root].push({"key":key, "iteration_id":frags.iteration_id});
            } else {
                iterations[frags.key_root] = [{"key":key, "iteration_id":frags.iteration_id}];
            }
        });
        console.debug(iterations);

        var result = [];
        for ( key_root in iterations ) {

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

    var isEmptyIteration = function( key ) {
        var hasNonZeroValues =
            carto_dataset.column(key).some(function(v){return v!=0;});
        return ! hasNonZeroValues;
    }

    var getKeyFragments = function( key ) {
            // All keys should be of the form blahblah_XXX where XXX is a 3 digit number
            var frags = key.split(/_(\d{3})$/)

            // When I tested, there was an empty string at the end of the fragments.
            // Get rid of empty strings in case they are implementation-dependent.
            frags = frags.filter(function(v){return v != "";});

            // Do we have the correct number of key fragments?
            if ( frags.length == 2 ) {
                return { "key_root": frags[0], "iteration_id": parseInt(frags[1]) };
            } else {
                return null;
            }
    }


    ////// Privileged ///////

    this.allIndicatorKeys = function() {
        return carto_dataset.userDefinedColumnNames().filter( function ( column_name ) {
            // Some user defined columns are not indicators.
            return [ "geo_code", "geo_name" ].indexOf( column_name.toLowerCase() ) == -1;
        });
    }

    this.latestIndicatorKeys = function() {
        if ( ! latestIndicatorKeys ) {
            latestIndicatorKeys = getLatestIndicatorKeys();
        }
        return latestIndicatorKeys;
    }

    this.getIndicatorCategory = function(iteration_key) {
        // to do
        return "to do: getIndicatorCategory()"
    }
    this.getIndicatorName = function(iteration_key) {
        // to do
        return "to do: getIndicatorName()"
    }
    this.getMenuItemLabel = function(iteration_key) {
        // to do
        return "to do: getMenuItemLabel()"
    }

    this.numRows = function() {
        return carto_dataset.numRows();
    }

    this.indicator = function(key) {
        var result = null
        var data = carto_dataset.column(key);

        if ( data != null ) {
            result = {
                "data": data,
                "geoNames": carto_dataset.column("geo_name"),
                "geoCodes": carto_dataset.column("geo_code"),
                "min": function() {
                    // ASSUMPTION: Falsey values are missing values, not zero.
                    // To do: WRONG assumption!!!
                    return Math.min.apply(null, this.data.filter(function(x){return x;}) );
                },
                "max": function() {
                    // ASSUMPTION: Falsey values are missing values, not zero.
                    // To do: WRONG assumption!!!
                    return Math.max.apply(null, this.data.filter(function(x){return x;}) );
                },
                "unitsLabel": carto_dataset.columnPropertyValue(key, "MEASUREUNIT")
            };
        }

        return result;
    }

    this.getGeoNames = function() {
        return carto_dataset.column("geo_name");
    }
}


