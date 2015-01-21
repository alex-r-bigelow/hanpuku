var test = d3.selectAll('#Layer_1').selectAll('path').data([0]);
test.enter().append('path');

test.attr('d','M600,350 l 50,-25 ' +
           'a25,25 -30 0,1 50,-25 l 50,-25 ' +
           'a25,50 -30 0,1 50,-25 l 50,-25 ' +
           'a25,75 -30 0,1 50,-25 l 50,-25 ' +
           'a25,100 -30 0,1 50,-25 l 50,-25')
    .attr('stroke','black')
    .attr('fill','none')
    .attr('stroke-width','0.5px');