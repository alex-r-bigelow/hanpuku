var artboardBounds = jQuery('.artboard')[0].getBoundingClientRect();

var margin = {top: 20, right: 20, bottom: 30, left: 40},
  width = artboardBounds.width - margin.left - margin.right,
  height = artboardBounds.height - margin.top - margin.bottom;

var x0 = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

var x1 = d3.scale.ordinal();

var y = d3.scale.linear()
    .range([height, 0]);

var color = d3.scale.ordinal()
    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

var xAxis = d3.svg.axis()
    .scale(x0)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format(".2s"));

// Get our container, apply the margin if it's the first time
var svg = d3.select('#Layer_1').selectAll('.scatterplot').data([0]);
var svgEnter = svg.enter();
svgEnter.append('g')
   .attr('class', 'scatterplot')
   .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

d3.csv("statePopulation.csv", function(error, data) {
  var ageNames = d3.keys(data[0]).filter(function(key) { return key !== "State"; });

  data.forEach(function(d) {
    d.ages = ageNames.map(function(name) { return {name: name, value: +d[name]}; });
  });

  x0.domain(data.map(function(d) { return d.State; }));
  x1.domain(ageNames).rangeRoundBands([0, x0.rangeBand()]);
  y.domain([0, d3.max(data, function(d) { return d3.max(d.ages, function(d) { return d.value; }); })]);

  // Always rebuild the axes from scratch
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
      .text("Population");

  var state = svg.selectAll(".state")
      .data(data);
  state.enter().append("g")
      .attr("class", "state");
  state.exit().remove();
  state.attr("transform", function(d) { return "translate(" + x0(d.State) + ",0)"; });

  var ageRange = state.selectAll(".bar")
      .data(function(d) { return d.ages; });
  ageRange.enter().append("path")
      .attr("class", "bar");
  ageRange.exit().remove();
  ageRange.rectAttr(function(d) { return x1(d.name); },
                    function(d) { return y(d.value); },
                    x1.rangeBand(),
                    function(d) { return height - y(d.value); })
      .style("fill", function(d) { return color(d.name); });

  var legend = svg.selectAll(".legend")
      .data(ageNames.slice().reverse());
  var legendEnter = legend.enter().append("g")
      .attr("class", "legend");
  legendEnter.append("path");
  legendEnter.append("text");
  legend.exit().remove();
  legend.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.select("path")
      .rectAttr(width - 18, 0, 18, 18)
      .style("fill", color);

  legend.select("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });
});