var artboardBounds = jQuery('.artboard')[0].getBoundingClientRect();

var width = artboardBounds.width,
    height = artboardBounds.height;

d3.csv("energyNgrams.csv", function(error, data) {
    var reshapedData = [],
        stack = d3.layout.stack().offset("wiggle")
                .values(function (d) { return d.values; });
    
    Object.keys(data[0]).forEach(function (header) {
        if (header !== 'year') {
            reshapedData.push({name : header, values : []});
        }
    });
    
    data.forEach(function (row) {
        var h, header;
        for (h = 0; h < reshapedData.length; h += 1) {
            header = reshapedData[h].name;
            reshapedData[h].values.push({x: row.year, y: parseFloat(row[header])});
        }
    });
    
    var layers = stack(reshapedData);
    
    var x = d3.scale.linear()
        .domain([data[0].year, data[data.length-1].year])
        .range([0, width]);
    
    var y = d3.scale.linear()
        .domain([0, d3.max(layers, function(layer) { return d3.max(layer.values, function(d) { return d.y0 + d.y; }); })])
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
    paths.attr("d", function (d) { return area(d.values); });
    paths.attr("id", function (d) { return d.name; });
});