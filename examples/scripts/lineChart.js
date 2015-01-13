// TODO: This example breaks illustrator, because the line is too long...

var artboardBounds = jQuery('.artboard')[0].getBoundingClientRect();

var margin = {top: 20, right: 20, bottom: 30, left: 40},
  width = artboardBounds.width - margin.left - margin.right,
  height = artboardBounds.height - margin.top - margin.bottom;

var parseDate = d3.time.format("%d-%b-%y").parse;

var x = d3.time.scale()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var line = d3.svg.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.close); });

// Get our container, apply the margin if it's the first time
var svg = d3.select('#Layer_1').selectAll('.scatterplot').data([0]);
var svgEnter = svg.enter();
svgEnter.append('g')
   .attr('class', 'scatterplot')
   .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

d3.tsv("stock.tsv", function(error, data) {
  data.forEach(function(d) {
    d.date = parseDate(d.date);
    d.close = +d.close;
  });

  x.domain(d3.extent(data, function(d) { return d.date; }));
  y.domain(d3.extent(data, function(d) { return d.close; }));
  
  svg.select('#x_axis').remove();
  svg.append("g")
      .attr("id", "x_axis")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);
      
  svg.select('#y_axis').remove();
  svg.append("g")
      .attr("id", "y_axis")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Price ($)");

  svg.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line);
});