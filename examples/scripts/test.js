var test = d3.selectAll('#Layer_1').selectAll('path').data([0]);
var testEnter = test.enter();
testEnter.append('path');

test.attr('d','M0,350' +
        'L 50,325' +
        'M 100,200' +
        'L 150,325')
    .attr('stroke','black')
    .attr('fill','none')
    .attr('stroke-width','0.5px');

var test2 = d3.selectAll('#Layer_1').selectAll('text').data(['hi, there']);
var test2enter = test2.enter();
test2enter.append('text');

test2.text(function (d) { return d; });