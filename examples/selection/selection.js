selectedIDs = [];

d3.selectAll('.dot').each(function (d) {
    if (d.sepalLength > 6.9) {
        selectedIDs.push(this.getAttribute('id'));
    }
});