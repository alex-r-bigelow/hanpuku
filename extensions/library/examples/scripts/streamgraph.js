var artboardBounds = jQuery('.artboard')[0].getBoundingClientRect();

var width = artboardBounds.width,
    height = artboardBounds.height;

d3.js("randomStream.js", function(error, data) {
    var stack = d3.layout.stack().offset("wiggle"),
        layers = stack(data);
        
    var x = d3.scale.linear()
        .domain([0, data[0].length - 1])
        .range([0, width]);
    
    var y = d3.scale.linear()
        .domain([0, d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); })])
        .range([height, 0]);
    
    var color = d3.scale.linear()
        .range(["#aad", "#556"]);
    
    var area = d3.svg.area()
        .x(function(d) { return x(d.x); })
        .y0(function(d) { return y(d.y0); })
        .y1(function(d) { return y(d.y0 + d.y); });
    
    
    // Get our container, apply the margin if it's the first time
    var svg = d3.select('#Layer_1').selectAll('.streamgraph').data([0]);
    var svgEnter = svg.enter();
    svgEnter.append('g')
       .attr('class', 'streamgraph');
    
    var paths = svg.selectAll("path")
        .data(layers);
    paths.enter().append("path")
        .style("fill", function() { return color(Math.random()); });
    paths.attr("d", area);
});