/*jslint evil:true forin:true*/

/*
 * The purpose of this class is to act as an intermediary between
 * Illustrator and a mirror DOM that the GUI manipulates and that
 * d3.js code and CSS operate on.
 */

function DomManager (targetDiv) {
    var self = this;
    
    // Set up our iframe
    targetDiv = document.getElementById(targetDiv);
    targetDiv.innerHTML = "";
    self.iframe = document.createElement('iframe');
    targetDiv.appendChild(self.iframe);
    
    // Give it a CSS header element for user-injected CSS:
    element = self.iframe.contentDocument.createElement('style');
    element.setAttribute('type', 'text/css');
    element.setAttribute('id', 'userCSS');
    self.iframe.contentDocument.head.appendChild(element);
    
    // Variables I set later
    self.docName = undefined;
    self.viewBounds = undefined;
}
DomManager.PADDING = 64;
DomManager.DOM_LIBS = [
    'lib/jquery-1.11.0.min.js',
    'lib/d3.min.js',
    'scripts/iD3.js',
    'lib/phrogz.js'
];
DomManager.JSX_LIBS = [
    'lib/json2.js'
];
DomManager.prototype.zoomIn = function () {
    var self = this;
    var current = jQuery('#' + self.docName).css('zoom'),
        newZoom = current * 2;
    if (newZoom > 64) {
        newZoom = 64;
    }
    jQuery('#' + self.docName).css('zoom', newZoom);
    ejQuery('#zoomButtons span').text((newZoom*100) + "%");
};
DomManager.prototype.zoomOut = function () {
    var self = this;
    var current = jQuery('#' + self.docName).css('zoom'),
        newZoom = current / 2;
    if (newZoom < 0.03125) {
        newZoom = 0.03125;
    }
    jQuery('#' + self.docName).css('zoom', newZoom);
    ejQuery('#zoomButtons span').text((newZoom*100) + "%");
};
DomManager.prototype.initScope = function () {
    var self = this,
        s,
        scriptCallback = function (script) {
            self.runScript(script);
        },
        loadFunc = function () {
            var url = arguments[0],
                callback = arguments.length === 3 ? arguments[2] : arguments[1];
            if (DATA.hasFile(url) === true) {
                callback(undefined, DATA.getFile(url).parsed);
            } else {
                callback(url + " has not been loaded in the Data tab.", undefined);
            }
        };
    self.iframeScope = {
        window : self.iframe.contentWindow,
        document : self.iframe.contentDocument,
        selectedIDs : SELECTED_IDS
    };
    for (s = 0; s < DomManager.DOM_LIBS.length; s += 1) {
        ejQuery.ajax({
            url : DomManager.DOM_LIBS[s],
            success : scriptCallback,
            async : false
        });
    }
    /**
     * I need to make the locally defined libraries accessible
     * in the normal way... this is kind of nuanced for each library
     */
    self.runScript('jQuery = window.jQuery;');
    self.runScript('var d3 = window.parent.d3;');
    /**
     * I also need to monkey patch the local d3's file loading schemes;
     * we've already loaded and parsed any relevant files in the Data tab
     * (or if we haven't they need to put it there!)
     */
    d3._text = d3.text;
    d3.text = loadFunc;
    d3._json = d3.json;
    d3.json = loadFunc;
    d3._xml = d3.xml;
    d3.xml = loadFunc;
    d3._html = d3.html;
    d3.html = loadFunc;
    d3._csv = d3.csv;
    d3.csv = loadFunc;
    d3._tsv = d3.tsv;
    d3.tsv = loadFunc;
    //d3._js = d3.js;
    d3.js = loadFunc;
};
DomManager.prototype.runScript = function (script)
{
    var self = this;
    
    // execute script in private context - not for security, but
    // for a cleaner scope that feels more like coding in a normal browser
    (new Function( "with(this) { " + script + "}")).call(self.iframeScope);
    
    // if we ran a script that appended an SVG (most bl.ocks.org examples do this),
    // we need to convert it to a layer group and add an artboard
    ejQuery(self.iframe).contents().find('svg').each(function () {
        // TODO: Support HTML conversion + a more elegant way to incorporate any SVG elements
        self.unifySvgTags(this);
    });
};
DomManager.prototype.unifySvgTags = function (svgNode) {
    var self = this,
        newId = svgNode.getAttribute('id'),
        svg,
        artboard,
        group,
        groupNode,
        bounds,
        targetSvg;
    if (self.docName === newId) {
        return;
    }
    
    // Force the SVG to absolute coordinates (TODO: do this more elegantly!)
    svg = jQuery(svgNode);
    svg.css({
        position: 'absolute',
        left: '0px',
        top: '0px'
    });
    bounds = svgNode.getBoundingClientRect();
    
    // Create the artboard and group elements
    artboard = jQuery(document.createElementNS('http://www.w3.org/2000/svg','path'));
    artboard.attr({
        'class' : 'artboard',
        'fill' : '#fff',
        'stroke-width' : '1',
        'stroke' : '#000',
        'd' : 'M' + bounds.left + ',' + bounds.top +
              'L' + bounds.right + ',' + bounds.top +
              'L' + bounds.right + ',' + bounds.bottom +
              'L' + bounds.left + ',' + bounds.bottom + 'Z'
    });
    groupNode = document.createElementNS('http://www.w3.org/2000/svg','g');
    group = jQuery(groupNode);
    group.attr({
        'transform' : 'translate(' + bounds.left + ',' + bounds.top + ')'
    });
    if (newId !== null) {
        artboard.attr('id', newId + '_Artboard');
        group.attr('id', newId);
    }
    
    // Move all the child nodes over
    while (svgNode.childNodes.length > 0) {
        groupNode.appendChild(svgNode.childNodes[0]);
    }
    
    // Remove the old svg tag
    svg.remove();
    
    // Add the new stuff to the main svg
    targetSvg = jQuery('#' + self.docName);
    targetSvg.find('.artboard:last').after(artboard);
    targetSvg.find('g:last').after(group);
    
    // Update the main svg viewbox
    if (bounds.left - DomManager.PADDING < self.viewBounds.left) {
        self.viewBounds.left = bounds.left - DomManager.PADDING;
    }
    if (bounds.top - DomManager.PADDING < self.viewBounds.top) {
        self.viewBounds.top = bounds.top - DomManager.PADDING;
    }
    if (bounds.right + DomManager.PADDING > self.viewBounds.right) {
        self.viewBounds.right = bounds.right + DomManager.PADDING;
    }
    if (bounds.bottom + DomManager.PADDING > self.viewBounds.bottom) {
        self.viewBounds.bottom = bounds.bottom + DomManager.PADDING;
    }
    self.viewBounds.width = self.viewBounds.right - self.viewBounds.left;
    self.viewBounds.height = self.viewBounds.bottom - self.viewBounds.top;
    
    targetSvg.attr('width', self.viewBounds.width)
             .attr('height', self.viewBounds.height);
    // jQuery changes viewBox to viewbox
    targetSvg[0].setAttribute('viewBox', (self.viewBounds.left) + ' ' + (self.viewBounds.top) + ' ' +
                              (self.viewBounds.width) + ' ' + (self.viewBounds.height));
};

/**
 *
 * domToDoc
 *
 **/
DomManager.prototype.domToDoc = function () {
    
};

/**
 *
 * docToDom
 *
 **/
DomManager.prototype.docToDom = function () {
    var self = this;
    ILLUSTRATOR.runJSX(null, 'scripts/docToDom.jsx', function (result) {
        if (result !== null) {
            // Set up the document
            self.docName = result.name;
            self.iframe.contentDocument.body.innerHTML = ""; // nuke everything so we start fresh
            
            // Clear out the javascript scope, load the relevant libraries, and init selectedIDs
            SELECTED_IDS = result.selection;
            self.initScope();
            
            // Style the main svg element to match Illustrator's UI
            self.viewBounds = {
                left : result.left - DomManager.PADDING,
                top : result.top - DomManager.PADDING,
                right : result.right + DomManager.PADDING,
                bottom : result.bottom + DomManager.PADDING
            };
            self.viewBounds.width = self.viewBounds.right - self.viewBounds.left;
            self.viewBounds.height = self.viewBounds.bottom - self.viewBounds.top;
            
            d3.select('body')
                .style('margin','0')
                .style('background-color', EXTENSION.bodyColor);
            
            var svg = d3.select('body').append('svg')
                .attr('id', result.name)
                .attr('width', self.viewBounds.width)
                .attr('height', self.viewBounds.height)
                .attr('viewBox', (self.viewBounds.left) + ' ' + (self.viewBounds.top) + ' ' +
                                  (self.viewBounds.width) + ' ' + (self.viewBounds.height))
                .attr('zoom', '100%');
            
            // Add the artboards
            var artboards = svg.selectAll('.artboard').data(result.artboards);
            artboards.enter().append('rect')
                .attr('class','artboard');
            artboards.attr('id',phrogz('name'))
                .attr('x',function (d) { return d.rect[0]; })
                .attr('y',function (d) { return d.rect[1]; })
                .attr('width',function (d) { return d.rect[2] - d.rect[0]; })
                .attr('height',function (d) { return d.rect[3] - d.rect[1]; })
                .attr('fill','#fff')
                .attr('stroke-width', 1)
                .attr('stroke','#000');
            
            // Add the layers
            var l, newLayer;
            result.layers = result.layers.sort(phrogz('zIndex'));
            for (l = 0; l < result.layers.length; l += 1) {
                newLayer = svg.append('g')
                    .attr('id', result.layers[l].name);
                self.addChildLayers(newLayer, result.layers[l]);
            }
            
            // Sneaky hack: we set all the REVERSE transforms in the self.addChildLayers()
            // recursive bit; calling toCubicPaths on everything will apply all the reverse transforms
            // so that elements will have their native coordinates - and then we can
            // set the new, double-reversed transforms as the regular transform property.
            // This way, everything in d3-land looks like nothing happened to the
            // transform tags, even though the native Illustrator positions were previously
            // baked in.
            svg.toCubicPaths(undefined, true);
            jQuery('svg g, svg path').each(function () {
                if (this.hasAttribute('id3_reverseTransform')) {
                    this.setAttribute('transform',this.getAttribute('id3_reverseTransform'));
                    this.removeAttribute('id3_reverseTransform');
                }
            });
        }
        EXTENSION.updateUI();
    });
};
DomManager.prototype.extractPathString = function (path) {
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
};
DomManager.prototype.addPath = function (parent, path) {
    var self = this,
        p = parent.append('path')
        .attr('id', path.name)
        .attr('d', self.extractPathString(path))
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
};
DomManager.prototype.addChildGroups = function (parent, group) {
    var self = this,
        g,
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
        self.addChildGroups(newGroup, group.groups[g]);
    }
    group.paths = group.paths.sort(phrogz('zIndex'));
    for (p = 0; p < group.paths.length; p += 1) {
        self.addPath(parent, group.paths[p]);
    }
};
DomManager.prototype.addChildLayers = function (parent, layer) {
    var self = this,
        l,
        newGroup,
        p;
    layer.groups = layer.groups.sort(phrogz('zIndex'));
    for (l = 0; l < layer.groups.length; l += 1) {
        newGroup = parent.append('g')
            .attr('id', layer.groups[l].name);
        self.addChildGroups(newGroup, layer.groups[l]);
    }
    layer.paths = layer.paths.sort(phrogz('zIndex'));
    for (p = 0; p < layer.paths.length; p += 1) {
        self.addPath(parent, layer.paths[p]);
    }
};