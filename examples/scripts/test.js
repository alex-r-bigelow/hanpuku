var data = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
];

var arcSections = d3.selectAll('#Layer_1').selectAll('g').data(data);
var arcSectionsEnter = arcSections.enter().append('g');

arcSectionsEnter.attr('transform', function (d) {
    return 'translate(' + d[0] * 300 + ',' + d[1] * 200 + ')';
});

arcSectionsEnter.append('path')
    .attr('class', 'background')
    .attr('d', function (d) {
        var result = '',
            i;
        for (i = 0; i < data.length; i += 1) {
            result += 'M 125,75 a100,50 0 ';
            result += data[i].join(',');
            result += ' 100,50';
        }
        return result;
    })
    .style('stroke', 'black')
    .style('fill', 'none')
    .style('stroke-width', '1');
arcSectionsEnter.append('path')
    .attr('class', 'foreground')
    .attr('d', function (d) {
        return 'M 125,75 a100,50 0 ' + d.join(',') + ' 100,50';
    })
    .style('stroke', 'red')
    .style('fill', 'none')
    .style('stroke-width', '6');

/*var test = d3.selectAll('#Layer_1').selectAll('text').data([0]);
var testEnter = test.enter();
testEnter.append('text');
test.text('hi, there!')
    .style('font-family','Futura-CondensedExtraBold,sans serif');*/