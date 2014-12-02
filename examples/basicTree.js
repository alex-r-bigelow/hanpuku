var artboardBounds = jQuery('.artboard')[0].getBoundingClientRect();

var margin = {top: 40, right: 40, bottom: 40, left: 40},
  width = artboardBounds.width - margin.left - margin.right,
  height = artboardBounds.height - margin.top - margin.bottom;

var tree = d3.layout.tree()
    .size([height, width]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

// Get our container, apply the margin if it's the first time
var svg = d3.select('#Layer_1').selectAll('.basicTre').data([0]);
var svgEnter = svg.enter();
svgEnter.append('g')
   .attr('class', 'basicTree')
   .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

d3.csv("basicTree.csv", function(error, links) {
  var graph = {
        nodes : [],
        links : []
      },
      nodesByName = {};
  
  // Create nodes for each unique source and target.
  function nodeByName(name) {
    return nodesByName[name] || (nodesByName[name] = {name: name});
  }
  
  links.forEach(function(link) {
    var parent = link.source = nodeByName(link.source),
        child = link.target = nodeByName(link.target);
    if (parent.children) parent.children.push(child);
    else parent.children = [child];
  });

  // Extract the root node and compute the layout.
  var nodes = tree.nodes(links[0].source);

  // Create the link lines.
  var linkItems = svg.selectAll(".link")
      .data(links);
  linkItems.enter().append("path")
      .attr("class", "link");
  linkItems.attr("d", diagonal);

  // Create the node circles.
  var nodeItems = svg.selectAll(".node")
      .data(nodes);
  nodeItems.enter().append("path")
      .attr("class", "node");
  nodeItems.circleAttr(function(d) { return d.y; },
                      function(d) { return d.x; },
                      4.5);
});