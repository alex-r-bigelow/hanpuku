/*jslint evil:true forin:true*/

/*
 * The purpose of this class is to act as an intermediary between the document and the DOM that
 * the d3.js code runs on.
 */

function DomPreview (targetDiv) {
    var self = this;
    
    // Set up iframe
    targetDiv = document.getElementById(targetDiv);
    targetDiv.innerHTML = "";
    self.iframe = document.createElement('iframe');
    targetDiv.appendChild(self.iframe);
    
    // Give it the relevant libraries
    var s, scriptElement;
    for (s = 0; s < DomPreview.LIBRARIES.length; s += 1) {
        scriptElement = self.iframe.contentDocument.createElement('script');
        scriptElement.setAttribute('type', 'application/javascript');
        scriptElement.setAttribute('src', DomPreview.LIBRARIES[s]);
        self.iframe.contentDocument.head.append(scriptElement);
    }
    
    // Init our selectedIDs array; this is null when a document isn't loaded
    self.selectedIDs = null;
}
DomPreview.LIBRARIES = [
    'lib/jquery-1.11.0.min.js',
    'lib/d3.min.js',
    'scripts/iD3.js',
    'lib/phrogz.js'
];
DomPreview.prototype.apply = function () {
    
};
DomPreview.prototype.eval = function (script)
{
    var self = this,
        mask = {},
        p;
    
    for (p in self) {
        mask[p] = undefined;
    }
    mask.document = self.iframe.contentDocument;
    mask.window = self.iframe.contentWindow;
    mask.selectedIDs = self.selectedIDs;
    
    // execute script in private context - not really secure, but
    // gives it a clean scope and it feels like a normal web page
    // with the only exception that selectedIDs is visible
    (new Function( "with(this) { " + script + "}")).call(mask);
};

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
    var p = parent.append('path')
        .attr('id', path.name)
        .attr('d', extractPathString(path))
        .style('fill', path.fill)
        .style('stroke', path.stroke)
        .style('stroke-width', path.strokeWidth)
        .style('opacity', path.opacity);
    if (path.classNames !== null) {
        p.attr('class', path.classNames);
    }
    if (p.reverseTransform !== null) {
        p.attr('transform', path.reverseTransform);
    }
    d3.select('#' + path.name).datum(path.data);
}

function addChildGroups (parent, group) {
    var g,
        newGroup,
        p;
    group.groups = group.groups.sort(phrogz('zIndex'));
    for (g = 0; g < group.groups.length; g += 1) {
        newGroup = parent.append('g')
            .attr('id', group.groups[g].name);
        if (group.groups[g].classNames !== null) {
            newGroup.attr('class', group.groups[g].classNames);
        }
        if (group.groups[g].reverseTransform !== null) {
            newGroup.attr('transform', group.groups[g].reverseTransform);
        }
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

DomPreview.prototype.reset = function () {
    runJSX(null, 'scripts/docToDom.jsx', function (result) {
        if (result === null) {
            clearGUI();
        } else {
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
            
            // Sneaky hack: calling standardize will apply all the reverse transforms
            // so that elements will have their native coordinates - and then we can
            // set the new, double-reversed transforms as the regular transformation.
            // This way, everything in d3-land looks like nothing happened to the
            // transform tags, even if the native Illustrator positions were previously
            // baked in.
            standardize();
            jQuery('#dom g, #dom path').each(function () {
                if (this.hasAttribute('id3_reverseTransform')) {
                    this.setAttribute('transform',this.getAttribute('id3_reverseTransform'));
                    this.removeAttribute('id3_reverseTransform');
                }
            });
            
            // Update the current selection
            selectedIDs = result.selection;
            updateGUI();
        }
    });
}