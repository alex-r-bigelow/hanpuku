var artboardBounds = jQuery('.artboard')[0].getBoundingClientRect();

var width = artboardBounds.width,
    height = artboardBounds.height;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

// Get our container, apply the margin if it's the first time
var svg = d3.select('#Layer_1').selectAll('.scatterplot').data([0]);
var svgEnter = svg.enter();
svgEnter.append('g')
   .attr('class', 'scatterplot');

d3.json("miserables.json", function(error, graph) {
  force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = svg.selectAll(".link")
      .data(graph.links);
  link.enter().append("path")
      .attr("class", "link")
      .style("stroke-width", function(d) { return Math.sqrt(d.value); });

  var node = svg.selectAll(".node")
      .data(graph.nodes, function (d) { return d.name; });
  node.enter().append("circle")
      .attr("class", "node")
      .attr("r", 5)
      .style("fill", function(d) { return color(d.group); });
  node.call(force.drag);

  node.append("title")
      .text(function(d) { return d.name; });

  force.on("tick", function() {
    link.attr("d", function(d) {
      return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
    });

    node.attr("transform", function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
  });
});