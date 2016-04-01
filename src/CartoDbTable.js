// CartoDbTable wraps the parsed json object returned by the CartoDB API to
// represent a CartoDB table. The CartoDbTable may optionally be initialised
// with extra metadata that applies to individual columns in the data table.
// The metadata source is another CartoDB table.
//
// Param raw_table is the table that will be wrapped.
//
// There are two optional paramaters. If one is present then both are required:
//
// Optional param raw_columns_metadata_table is the extra metadata that
// applies to individual columns in the data table.
//
// Optional param metadata_property_names_column_name is the name of the column
// in the metadata table that contains the metadata property names.
//
var CartoDbTable = new function( raw_table, raw_columns_metadata_table, metadata_property_names_column_name ) {

    /////// Private ///////

    // Give private functions access to this.
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

    // Get the values in a given column from the rows data.
    var getColumnFromRows = function(name) {
        if ( ! that.hasColumn(name) ) {
            return null;
        }
        return rows.map( function(row){ return row[name]; } );
    }

    // Some columns are only used for Carto Maps and should not be part of
    // the interface to this object.
    var isPublicColumnName = function(name) {
        return name != 'cartodb_id' &&
            name != 'the_geom' &&
            name != 'the_geom_webmercator' &&
            that.hasColumn(name);
    }



    /////// Privileged ///////

    // returns { column_name: value, ... }
    this.row = function(index) {
        return rows[index];
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
        return columnsMetadata.hasOwnProperty(column_name);
    }

    this.columnNames = function() {
        var result = [];
        for (column_name in columnsMetadata) {
            if isPublicColumnName(columnName) {
                result.push(column_name);
            }
        }
        return result;
    }

    this.columnProperty( column_name, property_name ) {
        return columnsMetadata[column_name][property_name];
    }


    /////// Constructor Code ////////

    if (raw_columns_metadata_table) {
        // The constructor arguments included a metadata table, so add the
        // metadata to the columnsMetadata.

        var metadata_table = new CartoTable(raw_columns_metadata_table);
        var property_names = metadata_table.column();

        // For each data table column
        this.columnNames().forEach( function(column_name) {

            // The extra metadata table need not contain metadata for every
            // column in the data table, so check whether the current column
            // is included in the metadata.
            if ( metadata_table.hasColumn(column_name) ) {

                property_names.forEach( function(property_name, i) {
                    columnsMetadata[column_name][property_name] = metadata_table.value(column_name, i)
                });
            }
        });

    }
}


// Load a given CartoDB dataset.
//
// Param dataset_name is the dataset identifier required by the CartoDB API.
//
// Param metadata_dataset_name is either null or the identifier of a metadata
// dataset that contains per-column properties of the main dataset.
//
// Param metadata_property_names_column_name is either null or the name of the
// column in the metadata dataset that contains the metadata property names.
//
// Param callback is a function to call on completion of the asynchronous
// CartoDB API request. The callback receives a single argument; an instance
// of CartoDbTable.
//
function loadCartoDbTable( dataset_name, metadata_dataset_name, metadata_property_names_column_name, callback ) {

    // Helper fn to make callbacks on successful http requests.
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
            console.error( "Request failed. Ready state: " + request.readyState + ", Status: " + request.statusText );
        };
    };

    var callClientCallback = function( metadata_request, data_request )
    {
        var raw_metadata_table = null;
        if ( metadata_request ) {
            raw_metadata_table = JSON.parse( columns_metadata_request.responseText );
        }

        callback( new CartoDbTable(
            JSON.parse( data_request.responseText ),
            raw_metadata_table,
            metadata_property_names_column_name ) );
    };

    var getColumnsMetadata = function( data_request )
    {
        if ( metadata_dataset_name ) {
            //console.debug( arguments.callee.toString().split("\n")[0] );
            var metadata_request = new XMLHttpRequest();
            metadata_request.open( "GET", "https://gmpagdata.cartodb.com/api/v2/sql?q=SELECT%20*%20FROM%20" + metadata_dataset_name, true );
            metadata_request.onload = getOnLoadFunction( callClientCallback, data_request );
            metadata_request.send( null );
        }
        else {
            callClientCallback( null, data_request );
        }
    };

    var getCartoDBData = function() {
        //console.debug( arguments.callee.toString().split("\n")[0] );
        var data_request = new XMLHttpRequest();
        data_request.open( "GET", "https://gmpagdata.cartodb.com/api/v2/sql?q=SELECT%20*%20FROM%20" + dataset_name + "%20ORDER%20BY%20cartodb_id", true );
        data_request.onload = getOnLoadFunction( getColumnsMetadata );
        data_request.send( null );
    };

    getCartoDBData();
};
