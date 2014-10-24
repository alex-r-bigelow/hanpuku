var selectedIDs = [];

function renderSelection() {
    document.getElementById('selectionPreview').innerHTML = "";
    
    var table = d3.select('#selectionPreview'),
        thead = table.append('thead').append('tr'),
        tbody = table.append('tbody');
    
    table.attr('cellspacing','0');
    
    thead.append('td').text('Selected Object IDs');
    thead.append('td').text('Bound d3.js Data');
    
    var tr = tbody.selectAll('tr').data(selectedIDs).enter().append('tr');
    
    tr.append('td').text(function (d) { return d; });
    tr.append('td').text(function (d) {
        var data = d3.select('#' + d).datum();
        if (data) {
            return JSON.stringify(data);
        } else {
            return "(no data)";
        }
    });
    
    var selectionRects = d3.select('#dom svg').selectAll('path.selection').data(selectedIDs);
    selectionRects.enter().append('path').attr('class','selection');
    selectionRects.exit().remove();
    var svgBounds = jQuery('#dom svg')[0].getBoundingClientRect();
    selectionRects.attr('d', function (d) {
        var bounds = document.getElementById(d).getBoundingClientRect();
        // I don't use getBBox() because we might be overlaying something inside a group
        // and the overlay paths need to be at the root level so we can add/remove them
        // easily. That said, we need to account for the padding on the svg element in
        // the preview
        return "M" + (bounds.left - svgBounds.left) + "," + (bounds.top - svgBounds.top) +
               "L" + (bounds.right - svgBounds.left) + "," + (bounds.top - svgBounds.top) +
               "L" + (bounds.right - svgBounds.left) + "," + (bounds.bottom - svgBounds.top) +
               "L" + (bounds.left - svgBounds.left) + "," + (bounds.bottom - svgBounds.top) +
               "Z";
    });
}