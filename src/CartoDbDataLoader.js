var CartoDbDataLoader = new function () {

    ////// Private //////

    var storedCallback = null;
    var xAxisName = null;

    var unpackData = function ( data_request, columns_metadata_request )
    {
        var data = JSON.parse( data_request.responseText );

        var result = JSON.parse( columns_metadata_request.responseText ).rows.map(
            function( row ) {
                return {
                    name : row['column_name'],
                    label : row['metric_label'],
                    shortLabel : row['short_metric_label'],
                    unitsLabel : row['units_label'],
                    description : row['description'],
                    descriptionPageTitle : row['description_page_title'],
                    category: row['category'],
                    x_axis : false,
                    y_axis : true,
                    data : data.rows.map( function( data_row ) {
                        return data_row[row['column_name']];
                    } ),
                    min : function() {
                        // ASSUMPTION: Falsey values are missing values, not zero.
                        return Math.min.apply(null, this.data.filter(function(x){return x;}) );
                    },
                    max : function() {
                        // ASSUMPTION: Falsey values are missing values, not zero.
                        return Math.max.apply(null, this.data.filter(function(x){return x;}) );
                    }
                };
            }
        );

        result.unshift(
            {
                name : xAxisName,
                x_axis : true,
                y_axis : false,
                data :  data.rows.map( function( data_row ) {
                    return data_row[xAxisName];
                } )
            }
        );

        result.getColumnByProperty = function( property_name, property_value )
        {
            return this.filter( function ( column ) {
                return column[property_name] == property_value;
            } )[0];
        };

        return result;
    };

    var makeCallback = function( columns_metadata_request, data_request )
    {
        storedCallback( unpackData( data_request, columns_metadata_request ) );
    };

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

    var getColumnsMetadata = function( data_request, dataset_name )
    {
        //console.debug( arguments.callee.toString().split("\n")[0] );
        var metadata_request = new XMLHttpRequest();
        metadata_request.open( "GET", "https://gmpagdata.cartodb.com/api/v2/sql?q=SELECT%20*%20FROM%20" + dataset_name + "_columnmetadata", true );
        metadata_request.onload = getOnLoadFunction( makeCallback, data_request );
        metadata_request.send( null );
    };

    var getData = function( dataset_name ) {
        //console.debug( arguments.callee.toString().split("\n")[0] );
        var data_request = new XMLHttpRequest();
        data_request.open( "GET", "https://gmpagdata.cartodb.com/api/v2/sql?q=SELECT%20*%20FROM%20" + dataset_name + "%20ORDER%20BY%20cartodb_id", true );
        data_request.onload = getOnLoadFunction( getColumnsMetadata, dataset_name );
        data_request.send( null );
    };


    ////// Privileged //////

    this.gimme = function ( dataset_name, x_axis_name, callback )
    {
        storedCallback = callback;
        xAxisName = x_axis_name;
        getData( dataset_name );
    }
};
