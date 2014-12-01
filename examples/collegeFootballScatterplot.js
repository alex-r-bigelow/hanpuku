var artboardBounds = jQuery('.artboard')[0].getBoundingClientRect();

var margin = {top: 20, right: 20, bottom: 30, left: 40},
  width = artboardBounds.width - margin.left - margin.right,
  height = artboardBounds.height - margin.top - margin.bottom;

// Get our container, apply the margin if it's the first time
var svg = d3.select('#Layer_1').selectAll('.scatterplot').data([0]);
var svgEnter = svg.enter();
svgEnter.append('g')
   .attr('class', 'scatterplot')
   .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

d3.tsv("collegeFootball.csv", function(error, data) {
  data.forEach(function(d) {
    d["Overall Percent"] = Number(d["Overall Percent"]);
    d["Bowl Percent"] = Number(d["Bowl Percent"]);
    d["Yrs"] = Number(d["Yrs"]);
  });
  
  var x = d3.scale.linear()
      .range([0, width]);
  
  var y = d3.scale.linear()
      .range([height, 0]);
  
  x.domain(d3.extent(data, function(d) { return d["Overall Percent"]; })).nice();
  y.domain(d3.extent(data, function(d) { return d["Bowl Percent"]; })).nice();
  
  var color = d3.scale.linear()
   .domain(d3.extent(data, function(d) { return d["Yrs"]; }))
   .range([colorbrewer.BrBG[3][2],colorbrewer.BrBG[3][0]]);
  
console.log(d3.extent(data, function(d) { return d["Yrs"]; }));

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
      .text("Overall Percent Wins");
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
      .text("Bowl Percent Wins");
  yAxis.call(d3.svg.axis()
              .scale(y)
              .orient("left"));
  
  // Select dots
  var dots = svg.selectAll(".dot")
      .data(data, phrogz('School'));
  // Create new dots
  dots.enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5);
  // Throw away old ones
  dots.exit().remove();
  // Update existing ones
  dots.attr("transform", function (d) { return "translate(" + x(d["Overall Percent"]) + "," + y(d["Bowl Percent"]) + ")"; })
      .style("fill", function(d) { return color(d["Yrs"]); })
      .attr("title", function (d) { return d["School"]; });
  
  // Select legend entries
  var legend = svg.selectAll(".legend")
      .data(color.domain(), function(d) { return d; });
  // Init legend entries
  var initLegend = legend.enter().append("g")
      .attr("class", "legend");
  initLegend.append("circle")
      .attr("class", "legendDot")
      .attr("r", 3.5);
  initLegend.append("text");
  // Remove old legend entries
  legend.exit().remove();
  // Update legend entries
  legend.select(".legendDot")
      .attr("transform", function(d, i) { return "translate(" + (width - 16) + "," + (i * 20) + ")"; })
      .style("fill", color);
  legend.select("text")
      .attr("transform", function(d, i) { return "translate(" + (width - 24) + "," + (i * 20 + 2) + ")"; })
      .style("text-anchor", "end")
      .text(function(d) { return d + " years playing"; });
});