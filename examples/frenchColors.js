// Add a French Revolution color theme...
var color = d3.scale.ordinal().range(['#f00','#00f','#f44','#44f','#f88','#88f','#fbb','#bbf']);

d3.selectAll(".node")
  .selectAll("path")
  .style("fill", function (d) {
        if (d === undefined) {
            return "#000";
        } else {
            return color(d.group);
        }
    });