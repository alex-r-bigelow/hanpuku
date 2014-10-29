(function() {
  d3.layout.indent = function() {
    var hierarchy = d3.layout.hierarchy(),
        separation = d3_layout_indentSeparation,
        nodeSize = [1, 1];

    function position(node, previousNode) {
      var children = node.children;
      node.y = previousNode ? previousNode.y + nodeSize[1] * separation(node, previousNode) : 0;
      node.x = node.depth * nodeSize[0];
      if (children && (n = children.length)) {
        var i = -1,
            n;
        while (++i < n) {
          node = position(children[i], node);
        }
      }
      return node;
    }

    function indent(d, i) {
      var nodes = hierarchy.call(this, d, i);
      position(nodes[0]);
      return nodes;
    }

    indent.nodeSize = function(value) {
      if (!arguments.length) return nodeSize;
      nodeSize = value;
      return indent;
    };

    indent.separation = function(value) {
      if (!arguments.length) return separation;
      separation = value;
      return indent;
    };

    return d3_layout_hierarchyRebind(indent, hierarchy);
  };

  function d3_layout_indentSeparation() {
    return 1;
  }

  // A method assignment helper for hierarchy subclasses.
  function d3_layout_hierarchyRebind(object, hierarchy) {
    d3.rebind(object, hierarchy, "sort", "children", "value");

    // Add an alias for nodes and links, for convenience.
    object.nodes = object;
    object.links = d3_layout_hierarchyLinks;

    return object;
  }

  // Returns an array source+target objects for the specified nodes.
  function d3_layout_hierarchyLinks(nodes) {
    return d3.merge(nodes.map(function(parent) {
      return (parent.children || []).map(function(child) {
        return {source: parent, target: child};
      });
    }));
  }
})();