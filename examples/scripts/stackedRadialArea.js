var formatDate = d3.time.format("%a"),
    formatDay = function(d) { return formatDate(new Date(2007, 0, d)); };

var artboardBounds = jQuery('.artboard')[0].getBoundingClientRect();

var width = artboardBounds.width,
    height = artboardBounds.height,
    outerRadius = height / 2 - 10,
    innerRadius = 120;

var angle = d3.time.scale()
    .range([0, 2 * Math.PI]);

var radius = d3.scale.linear()
    .range([innerRadius, outerRadius]);

var z = d3.scale.category20c();

var stack = d3.layout.stack()
    .offset("zero")
    .values(function(d) { return d.values; })
    .x(function(d) { return d.time; })
    .y(function(d) { return d.value; });

var nest = d3.nest()
    .key(function(d) { return d.key; });

var line = d3.svg.line.radial()
    .interpolate("cardinal-closed")
    .angle(function(d) { return angle(d.time); })
    .radius(function(d) { return radius(d.y0 + d.y); });

var area = d3.svg.area.radial()
    .interpolate("cardinal-closed")
    .angle(function(d) { return angle(d.time); })
    .innerRadius(function(d) { return radius(d.y0); })
    .outerRadius(function(d) { return radius(d.y0 + d.y); });

// Get our container, apply the margin if it's the first time
var svg = d3.select('#Layer_1').selectAll('.stackedRadialArea').data([0]);
var svgEnter = svg.enter();
svgEnter.append('g')
   .attr('class', 'stackedRadialArea')
   .attr('transform', 'translate(' + width/2 + ',' + height/2 + ')');

d3.csv("stackedRadialArea.csv", type, function(error, data) {
  var layers = stack(nest.entries(data));

  // Extend the domain slightly to match the range of [0, 2π].
  angle.domain([0, d3.max(data, function(d) { return d.time + 1; })]);
  radius.domain([0, d3.max(data, function(d) { return d.y0 + d.y; })]);

  var layerSelection = svg.selectAll(".layer")
      .data(layers);
  layerSelection.enter().append("path")
      .attr("class", "layer");
  layerSelection.attr("d", function(d) { return area(d.values); })
      .style("fill", function(d, i) { return z(i); });

  var axisSelection = svg.selectAll(".axis")
      .data(d3.range(angle.domain()[1]));
  axisSelection.enter().append("g")
      .attr("class", "axis")
      .append("text")
      .attr("class", "xLabels");
  axisSelection.attr("transform", function(d) { return "rotate(" + angle(d) * 180 / Math.PI + ")"; })
    .call(d3.svg.axis()
      .scale(radius.copy().range([-innerRadius, -outerRadius]))
      .orient("left"));
  axisSelection.selectAll(".xLabels")
      .attr("y", -innerRadius + 6)
      .attr("dy", ".71em")
      .attr("text-anchor", "middle")
      .text(function(d) { return formatDay(d); });
});

function type(d) {
  d.time = +d.time;
  d.value = +d.value;
  return d;
}
