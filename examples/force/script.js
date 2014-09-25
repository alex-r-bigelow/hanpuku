var width = 960,
    height = 500;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

var svg = d3.select("#dom").select("svg")
    .attr("width", width)
    .attr("height", height);

force
    .nodes($data.nodes)
    .links($data.links)
    .start();

var link = svg.selectAll(".link")
    .data($data.links)
  .enter().append("path")
    .attr("class", "link")
    .style("stroke-width", function(d) { return Math.sqrt(d.value); });

var node = svg.selectAll(".node")
    .data($data.nodes)
  .enter().append("circle")
    .attr("class", "node")
    .attr("r", 5)
    .style("fill", function(d) { return color(d.group); })
    .call(force.drag);

node.append("title")
    .text(function(d) { return d.name; });

force.on("tick", function() {
  link.attr("d", function(d) {
    return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
  });

  node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
});