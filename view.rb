# A class to render view templates.
#
# I thought about allowing an individual Mustache-derived class per view but
# wasn't sure how to rationalise the template and class system. My solution is
# to have a single Mustache-derived companion class to handle data for all
# views.

require 'mustache'


class View < Mustache

    def render context
        process_context context
        super context
    end

    private

    # Modify the context here, i.e. add everything required for your views.
    #
    # CONVENTION: Examine context[:status] to determine whether this view
    # is being published or previewed (or is targeted at an as-yet-unknown
    # state.)
    #
    def process_context context

        # Add your own data organisation here

        # If you wish, you can examine context[:src_filename] to determine
        # which view you are preparing. Alternatively, you can just give
        # every view an identical context.

        add_content_items_to_collections context

        if context[:src_filename] == './src/indicator-visualisations/index.html.mustache'
            add_viz_styles context
            add_viz_scripts context
        end
        if context[:src_filename] == './src/indicator-descriptions/index.html.mustache'
            add_desc_styles context
            add_desc_scripts context
        end
        if context[:src_filename] == './src/indicator-descriptions/all/index.html.mustache'
            add_all_desc_styles context
            add_all_desc_scripts context
        end
    end


    # Add collections of content items to the context.
    # One collection per content-type.
    # Only include items accessible in the current context status.
    #
    def add_content_items_to_collections context

        context[:all_metadata].select do |item|
            item[:file_type] == :content  && (
                context[:status] == :preview  ||  item['published'] )
        end.each do | item |
            context[( item['content_type'] + 's').to_sym ] ||= []
            context[( item['content_type'] + 's').to_sym ].push item
        end
    end

    def add_viz_styles context
            context[:styles] = %q~
    <style>

    #measure-name {
        margin-top: 40px;
    }

    #description-link p {
        margin-bottom: 0;
    }

/*
    #measure-selector ul {
        display: block;
        text-align: center;
        background-color: #eee;
    }
    #measure-selector .second-level .hidden {
        display: none;
    }
    #measure-selector .active {
        background-color: #ddd;
    }
    #measure-selector li {
        list-style: none;
        display: inline-block;
        padding: 0 14px;
    }
 */
     #measure-selector li a {
        cursor: pointer;
    }

    #chart-row {
        margin-top: 20px;
        margin-bottom: 2%;
    }

    #chart .c3-axis-x-label {
        font-size: 13px;
    }

    #map {
        height: 600px;

        /* Can't set a min-height (rather than a height) for the map.
           When I tried this, the map overflowed and covered the footer.
        min-height: 600px;*/
    }

    #table .region td {
        background-color: #eef;
    }

    #wrap .links {
        margin-top: 40px;
    }

    </style>
~
    end

    def add_viz_scripts context
        context[:scripts] = %q~
    <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/c3/0.4.10/c3.js"></script>
    <script src="http://libs.cartocdn.com/cartodb.js/v3/3.13/cartodb.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/datatables/1.10.7/js/jquery.dataTables.min.js"></script>
    <script src="../CartoDbDataLoader.js"></script>
    <script src="../CartoDbDataset.js"></script>
    <script src="../PovmonDataset.js"></script>
    <script src="visualisations.js"></script>
~
    end

    def add_desc_styles context
    end

    def add_desc_scripts context
        context[:scripts] = %q~
    <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script src="../GoogleDataLoader.js"></script>
    <script src="descriptions.js"></script>
~
    end

    def add_all_desc_styles context
        context[:styles] = %q~
<style>
    #all-descriptions p {
        margin-bottom: 0;
    }
</style>
~
    end

    def add_all_desc_scripts context
        context[:scripts] = %q~
    <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script src="../../CartoDbDataLoader.js"></script>
    <script src="../../GoogleDataLoader.js"></script>
    <script src="all-descriptions.js"></script>
~
    end
end
