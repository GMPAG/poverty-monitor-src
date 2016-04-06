// CONSTANTS

// NOTE: These column names are lower case because the import to CartoDB
// changes column names to lower case. In the original spreadsheet I'm working from, the column names are in upper case.
var ITERATION_PROPERTY_NAMES_COLUMN_NAME = 'item';
var INDICATOR_PROPERTY_NAMES_COLUMN_NAME = 'varname';



function PovmonDataset( datasets, indicator_metadata, iteration_metadata ) {

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
            if ( ! frags  ||  ! isFinite(frags.iterationId) ) {
                console.error( ["Invalid indicator key!", key, frags] );
                return;
            }

            // Create, or add to, an array of iterations for the given key root
            if ( iterations[frags.keyRoot] ) {
                iterations[frags.keyRoot].push({"key":key, "iterationId":frags.iterationId});
            } else {
                iterations[frags.keyRoot] = [{"key":key, "iterationId":frags.iterationId}];
            }
        });
        console.debug(iterations);

        var result = [];
        for ( keyRoot in iterations ) {

            var latest = {iterationId:-1};

            iterations[keyRoot].forEach( function(v) {
                if ( v.iterationId > latest.iterationId ) {
                    latest = v;
                }
            });

            result.push(latest.key);
        }
        console.debug(result);

        return result;
    }

    // Get a data column and its relevant geo_codes and geo_names.
    //
    // We are dealing with multiple datasets and each one applies to a
    // different set of geographic divisions, so we must make sure that any
    // indicator values are bundled with the correct geographic divisions.
    //
    var datasetColumn = function(key) {
        for ( var i = 0; i < datasets.length; i++ ) {
            var column = datasets[i].column(key);
            if (column) {
                return {
                    "data": column,
                    "geoCodes": datasets[i].column('geo_code'),
                    "geoNames": datasets[i].column('geo_name')
                }
            }
        }
        return null;
    }

    var iterationProperty = function(key, property_name) {
        var prop_names = iteration_metadata.column( ITERATION_PROPERTY_NAMES_COLUMN_NAME );
        var index = prop_names.indexOf( property_name );
        if ( index > -1 ) {
            return iteration_metadata.column(key)[index];
        } else {
            console.error( ["Unknown property name requested!", {"key":key, "property_name":property_name}] );
            return null
        }
    }

    var indicatorProperty = function(key, property_name) {
        var prop_names = iteration_metadata.column( INDICATOR_PROPERTY_NAMES_COLUMN_NAME );
        var index = prop_names.indexOf( property_name );
        if ( index > -1 ) {
            var frags = getKeyFragments(key);
            if ( frags ) {
                return iteration_metadata.column(frags.keyRoot)[index];
            }
        }

        console.error( ["Unknown key or property name requested!", {"key":key, "property_name":property_name}] );
        return null
    }

    var isEmptyIteration = function( key ) {
        var hasNonZeroValues = datasetColumn(key).data.some(function(v){return v!=0;});
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
                return { "keyRoot": frags[0], "iterationId": parseInt(frags[1]) };
            } else {
                return null;
            }
    }


    ////// Privileged ///////

    this.allIndicatorKeys = function() {
        // Collect all the user defined columns from the datasets.
        var result = datasets.reduce( function(acc, val) {
            return acc.concat( val.userDefinedColumnNames() );
        }, []);

        // Discard user defined columns that are not indicators.
        return result.filter( function ( column_name ) {
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

    this.indicator = function(key) {
        var result = datasetColumn(key);

        if ( result != null ) {
            result.min = function() {
                // ASSUMPTION: Falsey values are missing values, not zero.
                // To do: WRONG assumption!!!
                return Math.min.apply(null, this.data.filter(function(x){return x;}) );
            };
            result.max = function() {
                // ASSUMPTION: Falsey values are missing values, not zero.
                // To do: WRONG assumption!!!
                return Math.max.apply(null, this.data.filter(function(x){return x;}) );
            };
            result.unitsLabel = function() {
                var label = iterationProperty(key, "MEASUREUNIT_SYMBOL");
                return label ? label : "";
            };
            result.name = function() {
                //to do: get name from per-indicator metadata
                return "to do - implement indicator.name()";
            };
        }

        return result;
    }
}


// Load a poverty monitor dataset from multiple CartoDB tables.
//
// Param carto_dataset_names - Each named dataset contains the indicator
// values for a given set of geographical areas.
//
// Param indicator_metadata_name - the name of a metadata dataset that applies
// to all iterations of given indicators.
//
// Param iteration_metadata_name - the name of a metadata dataset that applies
// to single indicator iterations.
//
// Each CartoDB table is loaded asynchronously, so we use a callback counter
// to determine when we have all the available data.
//
function loadPovmonDataset( carto_dataset_names, indicator_metadata_name, iteration_metadata_name, callback ) {

    var datasets = [];
    var indicator_metadata = null;
    var iteration_metadata = null;

    var callback_counter = carto_dataset_names.length;
    if ( indicator_metadata_name ) {
        callback_counter++;
    }
    if ( iteration_metadata_name ) {
        callback_counter++;
    }

    var onDatasetLoaded = function() {
        callback_counter--;
        if ( callback_counter == 0 ) {
            callback( new PovmonDataset( datasets, indicator_metadata, iteration_metadata ) );
        }
    };

    carto_dataset_names.forEach( function(dataset_name) {
        loadCartoDbDataset(
            dataset_name,
            function(dataset) {
                datasets.push(dataset);
                onDatasetLoaded();
            }
        );
    });

    if ( indicator_metadata_name ) {
        loadCartoDbDataset(
            indicator_metadata_name,
            function(dataset) {
                indicator_metadata = dataset;
                onDatasetLoaded();
            }
        );
    }

    if ( iteration_metadata_name ) {
        loadCartoDbDataset(
            iteration_metadata_name,
            function(dataset) {
                iteration_metadata = dataset;
                onDatasetLoaded();
            }
        );
    }
}
