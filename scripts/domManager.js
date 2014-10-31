/*jslint evil:true forin:true*/

/*
 * The purpose of this class is to act as an intermediary between
 * Illustrator and a mirror DOM that the GUI manipulates and that
 * d3.js code and CSS operate on.
 */

function DomManager (targetDiv) {
    var self = this;
    
    // Init our selectedIDs array; this is null when a document isn't loaded
    self.selectedIDs = null;
    
    // Load the libraries that JSX scripts need (this is async, so do it first!)
    self.CSLibrary = new CSInterface();
    self.loadedJSXlibs = false;
    self.loadJSXlibs();
    
    // Set up our iframe
    targetDiv = document.getElementById(targetDiv);
    targetDiv.innerHTML = "";
    self.iframe = document.createElement('iframe');
    targetDiv.appendChild(self.iframe);
    
    // Clear out the javascript scope and then load the relevant libraries
    self.initScope();
    
    // Give it the CSS header for user-injected CSS:
    element = self.iframe.contentDocument.createElement('style');
    element.setAttribute('type', 'text/css');
    element.setAttribute('id', 'userCSS');
    self.iframe.contentDocument.head.appendChild(element);
}
DomManager.DOM_LIBS = [
    'lib/jquery-1.11.0.min.js',
    'lib/d3.min.js',
    'scripts/iD3.js',
    'lib/phrogz.js'
];
DomManager.JSX_LIBS = [
    'lib/json2.js'
];
DomManager.prototype.initScope = function () {
    var self = this,
        s;
    self.iframeScope = {
        window : self.iframe.contentWindow,
        document : self.iframe.contentDocument,
        selectedIDs : self.selectedIDs
    };
    for (s = 0; s < DomManager.DOM_LIBS.length; s += 1) {
        ejQuery.ajax({
            url : DomManager.DOM_LIBS[s],
            success : function (script) {
                self.runScript(script);
            },
            async : false
        });
    }
    /**
     * I need to make the locally defined jQuery accessible
     * in the normal way (d3 overlaps as well, but it loads
     * properly without this hack)
     */
    self.runScript('jQuery = window.jQuery;');
};
DomManager.prototype.runScript = function (script)
{
    var self = this;
    
    // execute script in private context - not really secure, but
    // gives it a clean scope and it feels like a normal web page
    // with the only exception that selectedIDs is visible
    (new Function( "with(this) { " + script + "}")).call(self.iframeScope);
};
/* Tools to interact with extendScript */
DomManager.prototype.loadJSXlibs = function () {
    var self = this,
        i = 0,
        successFunction = function (script) {
            self.CSLibrary.evalScript(script, function (r) {
                // evalScript is asynchronous, so we have to loop
                // this way to make sure everything is loaded
                // before we run stuff
                if (r.isOk === false) {
                    console.warn(r);
                    throw "Error Loading JSX";
                }
                i += 1;
                if (i < DomManager.JSX_LIBS.length) {
                    ejQuery.ajax({
                        url: DomManager.JSX_LIBS[i],
                        success: successFunction
                    });
                } else {
                    self.loadedJSXlibs = true;
                }
            });
        };
    ejQuery.ajax({
        url: DomManager.JSX_LIBS[i],
        success: successFunction
    });
};
DomManager.prototype.runJSX = function (input, path, callback) {
    var self = this;
    if (self.loadedJSXlibs === false) {
        // Try again in a second...
        window.setTimeout(function () { self.runJSX(input, path, callback); }, 1000);
    } else {
        ejQuery.ajax({
            url: path,
            success: function (script) {
                script = "var input=" + JSON.stringify(input) + ";\n" + script;
                self.CSLibrary.evalScript(script, function (r) {
                    var result;
                    if (r.search("Error") === 0 || r.isOk === false) {
                        throw r;
                    } else {
                        try {
                            result = JSON.parse(r);
                        } catch (e) {
                            console.warn("Couldn't parse:\n" + r);
                            throw e;
                        }
                    }
                    callback(result);
                });
            },
            cache: false
        });
    }
};

DomManager.prototype.domToDoc = function () {
    
};
/*DomManager.prototype.docToDom = function () {
    DomManager.runJSX(null, 'scripts/docToDom.jsx', function (result) {
        if (result !== null) {
            // Set up the document and the GUI
            self.iframe.contentDocument.body.innerHTML = ""; // nuke everything so we start fresh
            
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
        EXTENSION.refresh();
    });
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

DomManager.prototype.reset = function () {
    
}*/