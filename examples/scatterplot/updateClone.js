var margin = {top: 20, right: 20, bottom: 30, left: 40},
  width = doc.attr("width") - margin.left - margin.right,
  height = doc.attr("height") - margin.top - margin.bottom;

// Select container
var svg = doc.selectAll('#Layer_1');
svg.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

var data = $data;

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

// Reconstruct x axis
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

// Reconstruct y axis
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


// Select dots, store old data, apply new data
var dots = svg.selectAll(".dot")
    .property("__oldData__", function(d){ return d; })
    .data(data);
// Init new dots
dots.enter().appendClone(selectedIDs[0])
    .attr("class", "dot");
// Remove old dots
dots.exit().remove();
// Update remaining (and new) dots
dots.attr("transform", function (d) {
    if (this.__oldData__ && this.getAttribute('transform') === null) {
      // iD3 will have applied old transformations, so updates need to be relative
      return "translate(" + (x(d.sepalWidth) - x(this.__oldData__[0].sepalWidth)) + "," +
                            (y(d.sepalLength) - y(this.__oldData__[0].sepalLength)) + ")";
    } else {
      return "translate(" + x(d.sepalWidth) + "," + y(d.sepalLength) + ")";
    }
  })
    .style("fill", function(d) { return color(d.species); });
// Clear out any old data
dots.property("__oldData__", null);

// Select legend entries
var legend = svg.selectAll(".legend")
    .data(color.domain());
// Init legend entries
var initLegend = legend.enter().append("g")
    .attr("class", "legend");
initLegend.append("circle")
    .attr("class", "glyph")
    .attr("r", 3.5);
initLegend.append("text");
// Remove legend entries
legend.exit().remove();
// Update legend entries
legend.select(".glyph")
    .attr("transform", function(d, i) { return "translate(" + (width - 16) + "," + (i * 20) + ")"; })
    .style("fill", color);
legend.select("text")
    .attr("transform", function(d, i) { return "translate(" + (width - 24) + "," + (i * 20 + 2) + ")"; })
    .style("text-anchor", "end")
    .text(function(d) { return d; });