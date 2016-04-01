// CartoDBTable wraps the parsed json object returned by the CartoDB API to
// represent a CartoDB table. The CartoDBTable may optionally be initialised
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
var CartoTable = new function( raw_table, raw_columns_metadata_table, metadata_property_names_column_name ) {

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
