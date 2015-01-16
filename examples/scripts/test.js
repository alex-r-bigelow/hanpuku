var test = d3.selectAll('#Layer_1').selectAll('path').data([0]);
test.enter().append('path');

test.attr('d','M0,350' +
        'L 50,325' +
        'M 100,200' +
        'L 150,325')
    .attr('stroke','black')
    .attr('fill','none')
    .attr('stroke-width','0.5px');