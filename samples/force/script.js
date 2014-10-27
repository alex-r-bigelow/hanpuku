var width = doc.attr("width"),
    height = doc.attr("height");

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

var svg = doc.selectAll('#Layer_1');

var graph = $data;
force.nodes(graph.nodes)
      .links(graph.links)
      .start();

  var link = svg.selectAll(".link")
      .data(graph.links);
  link.enter().append("path")
      .attr("class", "link");
  link.exit().remove();
  link.style("stroke-width", function(d) { return Math.sqrt(d.value); });

  var node = svg.selectAll(".node")
      .data(graph.nodes);
  node.enter().append("g");
  node.appendCircle(0, 0, 5)
      .attr("class", "node");
  node.exit().remove();
  node.select(".node").style("fill", function(d) { return color(d.group); })
      .call(force.drag);
  node.append("title")
      .text(function(d) { return d.name; });

  force.on("tick", function() {
    link.attr("d", function(d) { return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y; });

    node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  });
