var artboardBounds = jQuery('.artboard')[0].getBoundingClientRect();

var width = artboardBounds.width,
    height = artboardBounds.height;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

// Get our container, apply the margin if it's the first time
var svg = d3.select('#Layer_1').selectAll('.force').data([0]);
var svgEnter = svg.enter();
svgEnter.append('g')
   .attr('class', 'linkLayer');
svgEnter.append('g')
   .attr('class', 'nodeLayer');
var linkLayer = d3.select('g.linkLayer');
var nodeLayer = d3.select('g.nodeLayer');

d3.json("miserables.json", function(error, graph) {
  force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = linkLayer.selectAll(".link")
      .data(graph.links);
  link.enter().append("path")
      .attr("class", "link")
      .style("stroke-width", function(d) { return Math.sqrt(d.value); });

  var node = nodeLayer.selectAll(".node")
      .data(graph.nodes, function (d) { return d.name; });
  var nodeEnter = node.enter().append("g")
      .attr("class", "node");
  nodeEnter.append('circle').attr("r", 5)
      .style("fill", function(d) { return color(d.group); });
  node.call(force.drag);

  force.on("tick", function() {
    link.attr("d", function(d) {
      return 'M' + d.source.x + ',' + d.source.y + 'L' + d.target.x + ',' + d.target.y;
    });

    node.attr("transform", function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
  });
});