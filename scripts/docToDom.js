function extractPathString(path) {
    var p,
        point = path.points[0],
        nextPoint,
        d = "M" + point.anchor[0] + "," + point.anchor[1];
    
    for (p = 0; p < path.points.length; p += 1) {
        point = path.points[p];
        if (p === path.points.length - 1) {
            if (path.closed !== true) {
                break;
            }
            nextPoint = path.points[0];
        } else {
            nextPoint = path.points[p + 1];
        }
        
        d += "C" + point.rightDirection[0] + "," + point.rightDirection[1] + "," +
                   nextPoint.leftDirection[0] + "," + nextPoint.leftDirection[1] + "," +
                   nextPoint.anchor[0] + "," + nextPoint.anchor[1];
    }
    if (path.closed === true) {
        d += "Z";
    }
    return d;
}

function addPath (parent, path) {
    parent.append('path')
        .attr('id', path.name)
        .attr('class', path.classNames)
        .attr('d', extractPathString(path))
        .style('fill', path.fill)
        .style('stroke', path.stroke)
        .style('stroke-width', path.strokeWidth)
        .style('opacity', path.opacity);
    d3.select('#' + path.name).datum(path.data);
}

function addChildGroups (parent, group) {
    var g,
        newGroup,
        p;
    group.groups = group.groups.sort(phrogz('zIndex'));
    for (g = 0; g < group.groups.length; g += 1) {
        newGroup = parent.append('g')
            .attr('id', group.groups[g].name)
            .attr('class', group.groups[g].classNames);
        d3.select('#' + group.groups[g].name).datum(group.groups[g].data);
        addChildGroups(newGroup, group.groups[g]);
    }
    group.paths = group.paths.sort(phrogz('zIndex'));
    for (p = 0; p < group.paths.length; p += 1) {
        addPath(parent, group.paths[p]);
    }
}

function addChildLayers (parent, layer) {
    var l,
        newGroup,
        p;
    layer.groups = layer.groups.sort(phrogz('zIndex'));
    for (l = 0; l < layer.groups.length; l += 1) {
        newGroup = parent.append('g')
            .attr('id', layer.groups[l].name);
        addChildGroups(newGroup, layer.groups[l]);
    }
    layer.paths = layer.paths.sort(phrogz('zIndex'));
    for (p = 0; p < layer.paths.length; p += 1) {
        addPath(parent, layer.paths[p]);
    }
}

function docToDom () {
    runJSX(null, 'scripts/docToDom.jsx', function (result) {
        if (result === null) {
            docIsActive = false;
            clearDOM();
        } else {
            docIsActive = true;
            
            // Set up the document and the GUI
            document.getElementById('dom').innerHTML = "";  // nuke the svg so we start fresh
            
            var svg = d3.select('#dom')
                .append('svg')
                .attr('width', result.width)
                .attr('height', result.height)
                .attr('id', result.name);
            jQuery('div button, textarea, input, select')
                .attr('disabled', false);
            
            // Add the artboards
            var artboards = svg.selectAll('.artboard').data(result.artboards);
            artboards.enter().append('rect')
                .attr('class','artboard');
            artboards.attr('id',phrogz('name'))
                .attr('x',function (d) { return d.rect[0]; })
                .attr('y',function (d) { return d.rect[1]; })
                .attr('width',function (d) { return d.rect[2] - d.rect[0]; })
                .attr('height',function (d) { return d.rect[3] - d.rect[1]; });
            
            // Add the layers
            var l, newLayer;
            result.layers = result.layers.sort(phrogz('zIndex'));
            for (l = 0; l < result.layers.length; l += 1) {
                newLayer = svg.append('g')
                    .attr('id', result.layers[l].name);
                addChildLayers(newLayer, result.layers[l]);
            }
            
            // Update the current selection
            selectedIDs = result.selection;
            
            // If the code areas are empty, fill them with some defaults
            // to give people an idea of what they can / should do
            if (jQuery('#dataEditor').val() === "") {
                jQuery('#dataEditor').val('$data = {};');
            }
            if (jQuery('#jsEditor').val() === "") {
                jQuery('#jsEditor').val('var doc = d3.select("#' + result.name + '"),\n' +
                                        '    artboards = d3.selectAll(".artboard");');
            }
        }
    });
}