var GoogleDataLoader = new function () {

    ////// Private //////

    var unpackData = function ( data )
    {
        var num_cols = data.getNumberOfColumns();
        var num_rows = data.getNumberOfRows();
        var columns = [];

        for ( var cx = 0; cx < num_cols; cx++ ) {

            columns.push( {
                id : data.getColumnId(cx),
                label : data.getColumnLabel(cx),
                data : [],
                min : function() {
                    // ASSUMPTION: Falsey values are missing values, not zero.
                    return Math.min.apply(null, this.data.filter(function(x){return x;}) );
                },
                max : function() {
                    // ASSUMPTION: Falsey values are missing values, not zero.
                    return Math.max.apply(null, this.data.filter(function(x){return x;}) );
                }
            } );

            for ( var rx = 0; rx < num_rows; rx++ ) {
                columns[cx].data.push( data.getFormattedValue( rx, cx ) );
            }
        }

        return columns;
    };



    ////// Privileged //////

    this.gimme = function ( dataset_url, callback )
    {
        var getDataAndMakeCallback = function() {

            var query = new google.visualization.Query( dataset_url );
            query.send( function (response) {
                var data = unpackData( response.getDataTable() );
                callback( data );
            });
        };

        google.load( 'visualization', '1' );
        google.setOnLoadCallback( getDataAndMakeCallback );
    }
};
