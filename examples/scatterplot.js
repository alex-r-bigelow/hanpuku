var artboardBounds = jQuery('#Artboard_1')[0].getBoundingClientRect();

var margin = {top: 20, right: 20, bottom: 30, left: 40},
  width = artboardBounds.width - margin.left - margin.right,
  height = artboardBounds.height - margin.top - margin.bottom;

// Select container
var svg = d3.select('#Layer_1');
svg.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

d3.tsv("flowers.tsv", function(error, data) {
  data.forEach(function(d) {
    d.sepalLength = Number(d.sepalLength);
    d.sepalWidth = Number(d.sepalWidth);
  });
  
  var x = d3.scale.linear()
      .range([0, width]);
  
  var y = d3.scale.linear()
      .range([height, 0]);
  
  x.domain(d3.extent(data, function(d) { return d.sepalWidth; })).nice();
  y.domain(d3.extent(data, function(d) { return d.sepalLength; })).nice();
  
  var color = d3.scale.category10();
  
  // Init or reconstruct x axis
  svg.select('#x_axis').remove();
  var xAxis = svg.append("g")
      .attr("id", "x_axis")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")");
  xAxis.append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Sepal Width (cm)");
  xAxis.call(d3.svg.axis()
              .scale(x)
              .orient("bottom"));
  
  // Init or reconstruct y axis
  svg.select('#y_axis').remove();
  var yAxis = svg.append("g")
      .attr("id", "y_axis")
      .attr("class", "y axis");
  yAxis.append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Sepal Length (cm)");
  yAxis.call(d3.svg.axis()
              .scale(y)
              .orient("left"));
  
  // Select dots
  var dots = svg.selectAll(".dot")
      .data(data, phrogz('rowNumber'));
  // Create new dots
  dots.enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5);
  // Throw away old ones
  dots.exit().remove();
  // Update existing ones
  dots.attr("transform", function (d) { return "translate(" + x(d.sepalWidth) + "," + y(d.sepalLength) + ")"; })
      .style("fill", function(d) { return color(d.species); });
  
  // Select legend entries
  var legend = svg.selectAll(".legend")
      .data(color.domain(), function(d) { return d; });
  // Init legend entries
  var initLegend = legend.enter().append("g")
      .attr("class", "legend");
  initLegend.append("circle")
      .attr("class", "glyph")
      .attr("r", 3.5);
  initLegend.append("text");
  // Remove old legend entries
  legend.exit().remove();
  // Update legend entries
  legend.select(".glyph")
      .attr("transform", function(d, i) { return "translate(" + (width - 16) + "," + (i * 20) + ")"; })
      .style("fill", color);
  legend.select("text")
      .attr("transform", function(d, i) { return "translate(" + (width - 24) + "," + (i * 20 + 2) + ")"; })
      .style("text-anchor", "end")
      .text(function(d) { return d; });
});