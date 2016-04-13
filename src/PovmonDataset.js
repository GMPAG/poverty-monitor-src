////////////
// "CONSTANTS"
//

var DetailLevel = { LA:"la", LSOA:"lsoa", BIG:"big" };
var GeoCodeRanges = {};
GeoCodeRanges[DetailLevel.LSOA] = { MIN: 'E01000000', MAX: 'E02000000' };
GeoCodeRanges[DetailLevel.LA] = { MIN: 'E08000000', MAX: 'E99999999' };
GeoCodeRanges[DetailLevel.BIG] = { MIN: 'E09000000', MAX: 'E99999999' };

// NOTE: These column names are lower case because the import to CartoDB
// changes column names to lower case. In the original spreadsheet I'm
// working from, the column names are in upper case.
var ITERATION_PROPERTY_NAMES_COLUMN_NAME = 'item';
var INDICATOR_PROPERTY_NAMES_COLUMN_NAME = 'varname';
var GEO_CODE_COLUMN_NAME = 'geo_code';
var GEO_NAME_COLUMN_NAME = 'geo_name';

// ASSUMPTION: Indicator names are in the first row of the indicator metadata.
// TO DO: ??? Calculate from INDICATOR_NAME_ROW_KEY ???
var INDICATOR_NAME_ROW_INDEX = 0;

//
////////////



var geoCodeInRange = function(detailLevel, code) {
    if ( ! detailLevel ) {
        debugger;
    }
    return GeoCodeRanges[detailLevel].MIN <= code &&
        code <= GeoCodeRanges[detailLevel].MAX;
}



function PovmonDataset( datasets, indicator_metadata, iteration_metadata ) {

    ////// Private ///////

    // Give private functions and inner functions access to this.
    var that = this;

    // Not calculating latestIndicatorKeys immediately, because doing so
    // requires access to member functions that are not yet defined.
    var latestIndicatorKeys = {};

    var getLatestIndicatorKeys = function( detail_level ) {

        var iterations = {};
        that.allIndicatorKeys().forEach( function(key) {

            if ( isEmptyIteration(key, detail_level) ) {
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
//         console.debug(iterations);

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
//         console.debug(result);

        return result;
    }

    var datasetColumn = function(key) {
        for ( var i = 0; i < datasets.length; i++ ) {
            var column = datasets[i].column(key);
            if (column) {
                return column;
            }
        }
        return null;
    }

    // Get a metadata property of a specific indicator iteration.
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

    // Get a metadata property of an indicator (applying to all iterations
    // of that indicator.)
    var indicatorProperty = function(key, property_name) {
        var prop_names = indicator_metadata.column( INDICATOR_PROPERTY_NAMES_COLUMN_NAME );
        var index = prop_names.indexOf( property_name );
        if ( index > -1 ) {
            var frags = getKeyFragments(key);
            if ( frags ) {
                return indicator_metadata.column(frags.keyRoot)[index];
            }
        }

        console.error( ["Unknown key or property name requested!", {"key":key, "property_name":property_name}] );
        return null
    }

    var isEmptyIteration = function( key, detail_level ) {
        var dataset = datasetContainingColumn(key);
        var geo_codes = dataset.column('geo_code');
        var hasNonZeroValues = dataset.column(key).some(function(value, index){
            return value !=0  &&  geoCodeInRange(detail_level, geo_codes[index]);
        });
        return ! hasNonZeroValues;
    }

    // Split key into { keyRoot, iterationID } where keyRoot is the key for an
    // indicator and iterationID identifies the iteration of that indicator.
    //
    var getKeyFragments = function( key ) {

            // ASSUMPTION: All keys should be of the form blahblah_XXX where XXX is a 3 digit number
            var frags = key.split(/_(\d{3})$/)

            // When I tested, there was an empty string at the end of the fragments.
            // Remove empty strings.
            frags = frags.filter(function(v){return v != "";});

            // Do we have the correct number of key fragments?
            if ( frags.length == 2 ) {
                return { "keyRoot": frags[0], "iterationId": parseInt(frags[1]) };
            } else {
                return null;
            }
    }

    var datasetContainingColumn = function(key) {
        for ( var i = 0; i < datasets.length; i++ ) {
            if ( datasets[i].hasColumn(key) ) {
                return datasets[i];
            }
        }
        return null;
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

    // Get the keys for the latest iteration of each indicator.
    this.latestIndicatorKeys = function(detail_level) {
        if ( ! latestIndicatorKeys[detail_level] ) {
            latestIndicatorKeys[detail_level] = getLatestIndicatorKeys(detail_level);
        }
        return latestIndicatorKeys[detail_level];
    }

    // How to display the indicator name in a menu item.
    this.getMenuItemLabel = function(iteration_key) {
        return indicatorProperty( iteration_key, "Indicator" );
    }

    this.getLatestIndicatorKeyFromName = function( indicator_name, detail_level ) {
        var root = this.getIndicatorRootKeyFromName( indicator_name );
        var keys = this.latestIndicatorKeys(detail_level);
        for ( var i = 0; i < keys.length; i++ ) {
            if ( keys[i].indexOf(root) == 0 ) {
                return keys[i];
            }
        }
        return null;
    }

    this.getIndicatorRootKeyFromName = function( indicator_name ) {
        var root_keys = indicator_metadata.userDefinedColumnNames();
        for ( var i = 0; i < root_keys.length; i++ ) {
            if ( indicator_metadata.value( INDICATOR_NAME_ROW_INDEX, root_keys[i] ) == indicator_name ) {
                return root_keys[i];
            };
        }
        return null;
    }

    // Get the data for a given indicator.
    // The returned object includes the relevant geographical IDs as well as
    // some utility functions.
    this.indicator = function(key, detail_level) {
//         console.debug( detail_level );
        var dataset = datasetContainingColumn(key);

        if ( ! dataset ) {
            return null;
        }

        var columns = {
            data: dataset.column(key),
            geoCodes: dataset.column(GEO_CODE_COLUMN_NAME),
            geoNames: dataset.column(GEO_NAME_COLUMN_NAME)
        };

        // Get the indexes of those rows relevant to the requested detail level
        var desired_indexes =
            columns.geoCodes.map(
                function(code, index) {
                    if ( geoCodeInRange( detail_level, code ) ) {
                        return index;
                    } else {
                        return null;
                    }
                }
            ).filter( function(index) { return index != null; }  );

        var result = { data:[], geoCodes:[], geoNames:[] };

        // Get the rows relevant to the requested detail level.
        desired_indexes.forEach( function(index) {
            result.data.push( columns.data[index] );
            result.geoNames.push( columns.geoNames[index] );
            result.geoCodes.push( columns.geoCodes[index] );
        });

        // Add other data and functions to the indicator.
        result.datasetName = dataset.name;
        result.detailLevel = detail_level;
        result.key = key;
        result.indicatorSlug = getKeyFragments(key).keyRoot;

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

        // NOTE: Not a function. We immediately call the anon fn to get a value
        result.title = function() {
            var title = indicatorProperty(key, "Indicator");
            return title ? title : "";
        }();

        // NOTE: Not a function. We immediately call the anon fn to get a value
        result.unitsLabel = function() {
            var label = iterationProperty(key, "MEASUREUNIT_SYMBOL_"+detail_level.toUpperCase());
            if ( label ) {
                if ( label.match( /^\w/ ) ) {
                    // label starts with a word character, so put a space
                    // in front of it.
                    label = ' ' + label;
                }
            } else {
                label = '';
            }
            return label;
        }();

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

    carto_dataset_names.forEach( function(dataset_name, index) {
        loadCartoDbDataset(
            dataset_name,
            function(dataset) {
                datasets[index] = dataset;
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
