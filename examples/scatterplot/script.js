  margin = {top: 20, right: 20, bottom: 30, left: 40},
  width = doc.attr("width") - margin.left - margin.right,
  height = doc.attr("height") - margin.top - margin.bottom;

// Select container
var svg = doc.selectAll('#Layer_1').data([1]);
// Init container
svg.enter().append('g');
// Update container
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

// Select x axis
var xAxis = svg.selectAll('#x_axis').data([1]);
// Init x axis
xAxis.enter().append("g")
    .attr("id", "x_axis")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
  .append("text")
    .attr("class", "label")
    .attr("x", width)
    .attr("y", -6)
    .style("text-anchor", "end")
    .text("Sepal Width (cm)");
// Update x axis
xAxis.call(d3.svg.axis()
            .scale(x)
            .orient("bottom"));

// Select y axis
var yAxis = svg.selectAll('#y_axis').data([1]);
// Init y axis
yAxis.enter().append("g")
    .attr("id", "y_axis")
    .attr("class", "y axis")
  .append("text")
    .attr("class", "label")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Sepal Length (cm)");
// Update y axis
yAxis.call(d3.svg.axis()
            .scale(y)
            .orient("left"));

// Select dots
var dots = svg.selectAll(".dot")
    .data(data);
// Init dots
dots.enter().append("circle")
    .attr("class", "dot")
    .attr("r", 3.5);
// Remove dots
dots.exit().remove();
// Update dots
dots.attr("cx", function(d) { return x(d.sepalWidth); })
    .attr("cy", function(d) { return y(d.sepalLength); })
    .style("fill", function(d) { return color(d.species); });

// Select legend entries
var legend = svg.selectAll(".legend")
    .data(color.domain());
// Init legend entries
var initLegend = legend.enter().append("g")
    .attr("class", "legend");
  initLegend.append("rect");
  initLegend.append("text");
// Remove legend entries
legend.exit().remove();
// Update legend entries
legend.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; })
  .select("rect")
    .attr("x", width - 18)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", color);
legend.select("text")
    .attr("x", width - 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function(d) { return d; });