var test = d3.selectAll('#Layer_1').selectAll('text').data([0]);
var testEnter = test.enter();
testEnter.append('text');
test.text('hi, there!')
    .style('font-family','Futura-CondensedExtraBold,sans serif');