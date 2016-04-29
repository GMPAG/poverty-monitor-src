//////////////////////////////////////////////////////////////////////////////
//
// CartoDbDataset wraps the parsed json object (param raw_table) returned by
// the CartoDB API to represent a CartoDB dataset.
//
// Edit: Commented out the following feature pending demonstrable need:
//     The CartoDbDataset may optionally be expanded with extra
//     metadata that applies to individual columns in the dataset.
//     The metadata source is another CartoDB dataset.
//
//////////////////////////////////////////////////////////////////////////////


function CartoDbDataset( raw_table ) {

    /////// Private ///////

    // Give private functions and inner functions access to this.
    var that = this;

    // The original CartoDB table representation: An array of rows.
    // [ { column name: value, ... }, ... ]
    var rows = raw_table.rows;

    // If columns are requested then we will calculate them from the rows and
    // cache them here, keyed by column name.
    // { column name: [ value, ... ], ... }
    var columns = {};

    // Some metadata associated with each column.
    // CartoDB just supplies the column datatype but we might add other things.
    // { column name: { property name: property value, ... }, ... }
    var columnsMetadata = raw_table.fields;

    // DEBUG - HACK
    // Uncomment these lines to make internal data structure visible to JS console.
//     this.rows = rows;
//     this.columnsMetadata = columnsMetadata;

    // Get the values in a given column from the rows data.
    var getColumnFromRows = function(name) {
        if ( ! that.hasColumn(name) ) {
            return null;
        }
        return rows.map( function(row){ return row[name]; } );
    }

    var isSpecialCartoDbColumn = function(name) {
        var names_of_special_columns = [
            'cartodb_id', 'the_geom', 'the_geom_webmercator', 'created_at', 'updated_at'
            ];
        return names_of_special_columns.indexOf(name) > -1;
    }



    /////// Privileged ///////

    // returns { column_name: value, ... }
    this.row = function(index) {
        return rows[index];
    }

    this.numRows = function() {
        return rows.length;
    }

    // returns [ value, ... ]
    this.column = function(name) {
        if ( ! columns.hasOwnProperty(name) ) {
            columns[name] = getColumnFromRows(name)
        }
        return columns[name];
    }

    this.value = function( row_index, column_name ) {
        return rows[row_index][column_name];
    }

    this.hasColumn = function(name) {
        // The columnsMetadata is keyed by column name, so this is one way to
        // check whether a column name exists.
        return columnsMetadata.hasOwnProperty(name);
    }

    // Get the names of the user-defined columns.
    // Ignores the special CartoDB-created columns
    // To do: ??? Reimplement to use getColumnNamesByColumnProperty ???
    this.userDefinedColumnNames = function() {
        var result = [];
        for (column_name in columnsMetadata) {
            if ( ! isSpecialCartoDbColumn(column_name) ) {
                result.push(column_name);
            }
        }
        return result;
    }

//     this.columnPropertyValue = function( column_name, property_name ) {
//         return columnsMetadata[column_name][property_name];
//     }

//     // Given a CartoDbDataset containing column-metadata and the name of the
//     // column in that dataset that contains the property names for that
//     // metadata, add the relevant column properties to the current
//     // table.
//     //
//     this.addColumnProperties = function( metadata_table, property_names_column_name ) {

//         if ( ! metadata_table.hasColumn(property_names_column_name) ) {
//             console.error( "Invalid column name (" + property_names_column_name + ") given for metdata property names." );
//             return;
//         }

//         var property_names = metadata_table.column(property_names_column_name);

//         // For each data table column
//         this.userDefinedColumnNames().forEach( function(column_name) {

//             // The extra metadata table need not contain metadata for every
//             // column in the data table, so check whether the current column
//             // is included in the metadata.
//             if ( metadata_table.hasColumn(column_name) ) {

//                 property_names.forEach( function(property_name, i) {
//                     columnsMetadata[column_name][property_name] = metadata_table.value(i, column_name)
//                 });
//             }
//         });
//     }

//     this.getColumnNamesByColumnProperty = function( property_name, property_value ) {
//         return Object.keys(columnsMetadata).filter( function ( column_name ) {
//             return that.columnPropertyValue(column_name, property_name) == property_value;
//         });
//     }
}


//////////////////////////////////////////////////////////////////////////////
// Load a given CartoDB dataset.
//
// Param dataset_name is the dataset identifier required by the CartoDB API.
//
// Param metadata_dataset_name is either null or the identifier of a metadata
// dataset that contains per-column properties of the main dataset.
//
// Param metadata_property_names_column_name is either null or the name of the
// column in the metadata dataset that contains the metadata property names.
// If metadata_dataset_name is non-null then this param *must* be a vaild
// column name in the relevant table.
//
// Param callback is a function to call on completion of the asynchronous
// CartoDB API request. The callback receives a single argument; an instance
// of CartoDbDataset.
//
function loadCartoDbDataset( dataset_name, callback ) {

    // Helper fn to execute an http request and trigger a callback on success.
    var getOnLoadFunction = function( requestHandler, params )
    {
        //console.debug( arguments.callee.toString().split("\n")[0] );
        return function (event) {
            //console.debug( arguments.callee.toString().split("\n")[0] );
            var request = event.target;
            // Is the request "DONE"? ( https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#xmlhttprequest-readystate )
            if (request.readyState === 4) {
                // Was the response "OK"?
                if (request.status === 200) {
                    // call the callback
                    requestHandler( request, params );
                    return;
                }
            }
            console.error( "Request failed. Ready state: " + request.readyState
                          + ", Status: " + request.statusText
                          + ", everything else: " + event );
        };
    };

    // Pass the requested CartoDbDataset to the client-supplied callback.
    var callClientCallback = function( data_request )
    {
        var dataset = new CartoDbDataset( JSON.parse( data_request.responseText ) );
        dataset.name = dataset_name;
        callback( dataset );
    };

    // Request the data for the indicated dataset
    var getDataset = function() {
        //console.debug( arguments.callee.toString().split("\n")[0] );
        var data_request = new XMLHttpRequest();
        data_request.open( "GET", "https://gmpagdata.cartodb.com/api/v2/sql?q=SELECT%20*%20FROM%20" + dataset_name + "%20ORDER%20BY%20cartodb_id", true );
        data_request.onload = getOnLoadFunction( callClientCallback );
        data_request.send( null );
    };

    // ...and go:
    getDataset();
};
