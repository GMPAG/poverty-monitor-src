//////////////////////////////////////////////////////////////////////////////
// PovmonDataset wraps multiple CartoDB datasets, including metadata, and
// presents an interface in the language of the poverty monitor.
//////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////
// CONSTANTS
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

var INDICATOR_NAME_ROW_KEY = "Indicator";
var ITERATION_NAME_ROW_KEY = "VARLABEL";
var ITERATION_FOR_DISPLAY_ROW_KEY = "DISPLAY_ON_POVMON";
var INDICATOR_ORDER_ROW_KEY = "DISPLAY_ORDER";

//
//////////////////////////////////////////////////////////////////////////////



var geoCodeInRange = function(detail_level, code) {
    if ( ! detail_level ) {
        debugger;
    }
    return GeoCodeRanges[detail_level].MIN <= code &&
        code <= GeoCodeRanges[detail_level].MAX;
}



function PovmonDataset( datasets, indicator_metadata, iteration_metadata ) {

    ////// Private ///////

    // Give private functions and inner functions access to this.
    var that = this;

    // Find the dataset that contains the given column name.
    // ASSUMPTION: The given column_name appears in only one dataset, or
    // it is irrelevant which dataset with that column_name is chosen.
    var datasetContainingColumn = function(column_name) {
        for ( var i = 0; i < datasets.length; i++ ) {
            if ( datasets[i].hasColumn(column_name) ) {
                return datasets[i];
            }
        }
        // No column found with that name.
        return null;
    }

    // Get a column of data from the datasets.
    // ASSUMPTION: The given column_name appears in only one dataset, or
    // it is irrelevant which dataset the column is taken from.
    var datasetColumn = function(column_name) {
        for ( var i = 0; i < datasets.length; i++ ) {
            var column = datasets[i].column(column_name);
            if (column) {
                return column;
            }
        }
        // No column found with that name.
        return null;
    }

    // Get a property from metadata.
    // Param propertyNamesColumnName is the name of a column that contains
    // property names. Used this way, the dataset is a matrix keyed by column
    // name and property name.
    var metadataProperty = function(metadata, propertyNamesColumnName, column_name, property_name) {
        var prop_names = metadata.column( propertyNamesColumnName );
        var index = prop_names.indexOf( property_name );
        if ( index > -1 ) {
            var column = metadata.column(column_name);
            if ( column ) {
                return column[index];
            }
        }

        console.error( [
            "Unknown property or column name!",
            {column_name:column_name, property_name:property_name}
        ] );
        return null
    }

    // Get a metadata property of a specific indicator iteration.
    var iterationProperty = function(key, property_name) {
       return metadataProperty(
           iteration_metadata,
           ITERATION_PROPERTY_NAMES_COLUMN_NAME,
           key,
           property_name
       );
    }

    // Get a metadata property of an indicator (applying to all iterations
    // of that indicator.)
    var indicatorProperty = function(key, property_name) {
       return metadataProperty(
           indicator_metadata,
           INDICATOR_PROPERTY_NAMES_COLUMN_NAME,
           key,
           property_name
       );
    }

    // Does the given iteration have no valid values at the given detail_level?
    var isEmptyIteration = function( iteration_key, detail_level ) {
        var dataset = datasetContainingColumn(iteration_key);
        var geo_codes = dataset.column('geo_code');
        var hasNonEmptyValues =
            dataset.column(iteration_key).some(function(value, index){
            // ASSUMPTION: Negative data is invalid. Our current data source
            // cannot contain nulls, hence the use of negative numbers.
            return value >= 0  &&  geoCodeInRange(detail_level, geo_codes[index]);
        });
        return ! hasNonEmptyValues;
    }

    // Split key into { keyRoot, iterationID } where keyRoot is the key for an
    // indicator and iterationID identifies the iteration of that indicator.
    //
    var getKeyFragments = function( key ) {

            // ASSUMPTION: All keys should be of the form blahblah_XXX where XXX is a 3 digit number
            var frags = key.split(/_(\d{3})$/)

            // When I tested, there was an empty string at the end of the fragments.
            // Remove any and all empty strings.
            frags = frags.filter(function(v){return v != "";});

            // Do we have the correct number of key fragments?
            if ( frags.length == 2 ) {
                var result = { "keyRoot": frags[0], "iterationId": parseInt(frags[1],10) };

                // ASSUMPTION: Iteration ID Must be a finite number.
                if ( isFinite(frags.iterationId) ) {
                    return result;
                }
            }

        return null;
    }

    var allIndicatorKeys = function() {
        var result = indicator_metadata.userDefinedColumnNames().filter( function(name) {
            return name != INDICATOR_PROPERTY_NAMES_COLUMN_NAME;
        });
//         console.debug(result);
        return result;
    }

    var allIterationKeys = function() {
        // Collect all the user defined columns from the datasets.
        var result = datasets.reduce( function(acc, val) {
            return acc.concat( val.userDefinedColumnNames() );
        }, []);

        // Discard user defined columns that are not indicators.
        return result.filter( function ( column_name ) {
            return [ "geo_code", "geo_name" ].indexOf( column_name.toLowerCase() ) == -1;
        });
    }

    var iterationKeysByIndicator = function( indicator_key ) {
        var prefix = indicator_key + '_';
        return allIterationKeys().filter( function( iteration_key ) {
            return 0 == iteration_key.indexOf(prefix);
        });
    }

    // Get the keys of iterations tagged for display for a given indicator.
    // ASSUMPTION: If no iterations are marked for display then the
    //             most recent non-empty iteration should be displayed.
    var displayableIterationKeys = function( indicator_key, detail_level ) {

        // Note that we are sorting the iteration_keys to put them in
        // chronological order.
        // ASSUMPTION: The default sort will order the keys chronologically.
        var iteration_keys = iterationKeysByIndicator(indicator_key).sort();
        if ( iteration_keys.length == 0 ) {
            return null;
        }

        var nonZeroIterations = iteration_keys.filter( function(iteration_key) {
            return ! isEmptyIteration( iteration_key, detail_level );
        });
        if ( nonZeroIterations.length == 0 ) {
            return null;
        }

        var result = nonZeroIterations.filter( function( iteration_key ) {
            return iterationProperty(
                iteration_key,
                ITERATION_FOR_DISPLAY_ROW_KEY+'_'+detail_level.toUpperCase()
            );
        });
        if ( result.length > 0 ) {
            return result;
        } else {
            // Return the most recent iteration key.
            // ASSUMPTION: The most recent iteration is a valid iteration for display.
            // ASSUMPTION: The most recent iteration is at the end of the array
            return [ nonZeroIterations.pop() ];
        }
    }

    var getIndicatorKeyFromName = function( indicator_name ) {
        var keys = allIndicatorKeys();
        for ( var i = 0; i < keys.length; i++ ) {
            if ( indicatorProperty( keys[i], INDICATOR_NAME_ROW_KEY ) == indicator_name ) {
                return keys[i];
            };
        }
        return null;
    }

    ////// Privileged ///////

    // Get those indicators that have at least one displayable iteration at
    // the given detail_level.
    this.availableIndicators = function( detail_level ) {
        var result = allIndicatorKeys().filter(
            function(key) {
                return !!displayableIterationKeys(key, detail_level);
            }
        ).map(
            function(key) {
                return {
                    key:key,
                    name:indicatorProperty(key,INDICATOR_NAME_ROW_KEY),
                    displayOrder:parseInt(
                        indicatorProperty(key,INDICATOR_ORDER_ROW_KEY), 10)
                };
            }
        ).sort(
            function(a,b) { return a.displayOrder - b.displayOrder; }
        );
//          console.debug(result);
        return result;
    }

    this.isIndicatorName = function( name ) {
        return !!getIndicatorKeyFromName( name );
    }

    // Get the data for a given indicator.
    // The returned object includes the relevant geographical IDs as well as
    // some utility functions.
    this.indicator = function(indicator_name, detail_level) {
//         console.debug( detail_level );

        var indicator_key = getIndicatorKeyFromName(indicator_name);
        var keys_for_display =
            displayableIterationKeys( indicator_key, detail_level );

        if ( ! keys_for_display ) {
            return null;
        }

        var result = {};
        result.iterations = keys_for_display.map( function(iteration_key) {

            var dataset = datasetContainingColumn(iteration_key);
            var values =  dataset.column(iteration_key);
            var geoCodes = dataset.column(GEO_CODE_COLUMN_NAME);
            var geoNames = dataset.column(GEO_NAME_COLUMN_NAME);

            var iteration = { values:[], geoCodes:[], geoNames:[] };

            // Get those rows relevant to the requested detail level
            geoCodes.forEach( function(code, row_index) {
                if ( geoCodeInRange( detail_level, code ) ) {
                    iteration.values.push( values[row_index] );
                    iteration.geoNames.push( geoNames[row_index] );
                    iteration.geoCodes.push( geoCodes[row_index] );
                }
            });

            // Add other data and functions to the iteration.
            iteration.datasetName = dataset.name;
            iteration.key = iteration_key;
            iteration.title =
                iterationProperty(iteration_key, ITERATION_NAME_ROW_KEY) || "";

            iteration.unitsLabel = iterationProperty(
                iteration_key, "MEASUREUNIT_SYMBOL_"+detail_level.toUpperCase()) || "";

            iteration.min = function() {
                // ASSUMPTION: Falsey values are missing values, not zero.
                // To do: WRONG assumption!!!
                return Math.min.apply(null, this.values.filter(function(x){return x;}) );
            };
            iteration.max = function() {
                // ASSUMPTION: Falsey values are missing values, not zero.
                // To do: WRONG assumption!!!
                return Math.max.apply(null, this.values.filter(function(x){return x;}) );
            };

            return iteration;
        });

        result.numIterations = result.iterations.length;
        result.latestIteration = result.iterations[result.numIterations-1];

        // Add other data and functions to the indicator.
        result.detailLevel = detail_level;
        result.title = indicatorProperty(indicator_key, INDICATOR_NAME_ROW_KEY) || "";

        result.mapLabel = indicatorProperty(
            indicator_key, "MAP_LABEL_"+detail_level.toUpperCase()) || "";

        result.visualisationIntroText = indicatorProperty(
            indicator_key, "VIS_PAGE_INTRO_"+detail_level.toUpperCase()) || "";

        result.chartYAxisLabel =
            indicatorProperty(indicator_key, "Y_AXIS_LABEL_"+detail_level.toUpperCase());

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
