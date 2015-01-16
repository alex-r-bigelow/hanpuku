/*jslint evil:true forin:true*/

/*
 * The purpose of this class is to act as an intermediary between
 * Illustrator and a mirror DOM that the GUI manipulates and that
 * d3.js code and CSS operate on.
 */

function DomManager () {
    var self = this,
        element;
    
    // Set up our iframe
    targetDiv = document.getElementById('domPreviewContent');
    targetDiv.innerHTML = "";
    self.iframe = document.createElement('iframe');
    targetDiv.appendChild(self.iframe);
    
    // Some initial CSS styles to make it feel more like
    // Illustrator's raw canvas
    element = self.iframe.contentDocument.createElement('style');
    element.setAttribute('type', 'text/css');
    element.setAttribute('id', 'illustratorFeel');
    self.iframe.contentDocument.head.appendChild(element);
    element.innerText = "text { font-family: 'Myriad Pro'; font-size: 12px; }";
    
    // Give it a CSS header element for user-injected CSS:
    element = self.iframe.contentDocument.createElement('style');
    element.setAttribute('type', 'text/css');
    element.setAttribute('id', 'userCSS');
    self.iframe.contentDocument.head.appendChild(element);
    
    // Variables I set / use later
    self.docName = undefined;
    self.viewBounds = undefined;
    self.nameLookup = undefined;
    self.lastNameLookup = undefined;
    self.copyNumber = 0;
}
DomManager.PADDING = 64;
DomManager.DOM_LIBS = [
    'lib/jquery-1.11.0.min.js',
    'lib/d3.min.js',
    "lib/queue.min.js",
    'lib/topojson.js',
    'lib/colorbrewer.js',
    'lib/hanpuku.js',
    'lib/phrogz.js'
];

DomManager.getElementType = function (e) {
    if (e.tagName === 'g') {
        if (e.parentNode.tagName === 'svg') {
            return 'layer';
        } else {
            return 'group';
        }
    } else {
        return e.tagName;
    }
};
DomManager.prototype.init = function () {
    
};
DomManager.prototype.disableUI = function () {
    var self = this;
    ejQuery('#zoomButtons button').attr('disabled', true);
    self.iframe.contentDocument.body.innerHTML = "";
};
DomManager.prototype.onRefresh = function () {
    ejQuery('#zoomButtons button').attr('disabled', false);
};
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
            self.runScript(script, true);
        },
        loadFunc = function () {
            var url = arguments[0],
                callback = arguments.length === 3 ? arguments[2] : arguments[1],
                file = DATA.getFile(url);
            if (file === undefined) {
                EXTENSION.displayMessage("<p style='color:#f00;'>" + url + " has not been loaded in the Data tab.</p>");
                //callback(url + " has not been loaded in the Data tab.", undefined);
            } else if (file.parsed.error_type !== undefined) {
                EXTENSION.displayMessage("<p style='color:#f00;'>Error parsing " + url + "; see the Data tab for details.</p>");
                //callback("Error parsing " + url + "; see the Data tab for details.", undefined);
            } else {
                callback(undefined, file.parsed);
            }
        };
    // Clear out old variables
    self.iframeScope = {};
    
    // Give it the basics
    self.iframeScope.window = self.iframe.contentWindow;
    self.iframeScope.document = self.iframe.contentDocument;
    self.iframeScope.selection = ILLUSTRATOR.getD3selection();
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
    self.runScript('jQuery = window.jQuery;', true);
    self.iframeScope.window.d3 = self.iframe.contentWindow.parent.d3;
    self.iframeScope.window.topojson = self.iframe.contentWindow.parent.topojson;
    self.iframeScope.window.queue = self.iframe.contentWindow.parent.queue;
    self.iframeScope.window.colorbrewer = self.iframe.contentWindow.parent.colorbrewer;
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
DomManager.prototype.runScript = function (script, ignoreSelection)
{
    var self = this,
        error;
    
    if (ignoreSelection !== true) {
        // remove our selection layer
        jQuery('#hanpuku_selectionLayer').remove();
    }
    
    // execute script in private context - not for security, but
    // for a cleaner scope that feels more like coding in a normal browser
    error = (new Function( "try{ with(this) { " + script +
                "} } catch(e) { var temp = e.stack.split('\\n'); " +
                "return [temp[0], temp[1].split(':')[2]]; } return null;")).call(self.iframeScope);
    if (error !== null) {
        EXTENSION.displayMessage('<p style="color:#f00;">' + error[0] + ' on line' + error[1] + '</p>');
        return false;
    }
    
    // if we ran a script that appended an SVG (most bl.ocks.org examples do this),
    // we need to convert it to a layer group and add an artboard
    ejQuery(self.iframe).contents().find('svg').each(function () {
        // TODO: Support HTML conversion + a more elegant way to incorporate any SVG elements
        self.unifySvgTags(this);
    });
    
    if (ignoreSelection !== true) {
        // restore the selection layer
        ILLUSTRATOR.updateSelection(self.iframeScope.selection);
        self.updateSelectionLayer();
    }
    
    return true;
};
DomManager.prototype.updateSelectionLayer = function () {
    var self = this;
    
    jQuery('#hanpuku_selectionLayer').remove();
    var layer = d3.select('#' + self.docName).append('g')
                    .attr('id', 'hanpuku_selectionLayer'),
        selectionRect = layer.selectAll('path').data(ILLUSTRATOR.selectedIDs);
    selectionRect.enter().append('path')
        .attr('fill', 'none')
        .attr('stroke-width', '5px')
        .attr('stroke', 'rgb(98,131,255)')
        .attr('d', function (d) {
            var bounds = self.iframe.contentDocument.getElementById(d).getBoundingClientRect();
            // I don't use getBBox() because we might be overlaying something inside a group
            // and the overlay paths need to be at the root level so we can add/remove them
            // easily. That said, we need to account for the svg element's viewBounds
            return "M" + (bounds.left + self.viewBounds.left) + "," + (bounds.top + self.viewBounds.top) +
                   "L" + (bounds.right + self.viewBounds.left) + "," + (bounds.top + self.viewBounds.top) +
                   "L" + (bounds.right + self.viewBounds.left) + "," + (bounds.bottom + self.viewBounds.top) +
                   "L" + (bounds.left + self.viewBounds.left) + "," + (bounds.bottom + self.viewBounds.top) +
                   "Z";
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
DomManager.SHORTHAND_REGEX = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
DomManager.HEX_PARSING_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
DomManager.prototype.color = function (s) {
    if (s[0] === '#') {
        // Stolen from http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        s = s.replace(DomManager.SHORTHAND_REGEX, function(m, r, g, b) {
            s = r + r + g + g + b + b;
        });
        
        var result = DomManager.HEX_PARSING_REGEX.exec(s);
        s = 'rgb(' + parseInt(result[1], 16) + ', ' +
                     parseInt(result[2], 16) + ', ' +
                     parseInt(result[3], 16) + ')';
    }
    if (s !== 'none' && s.substring(0,4) !== 'rgb(') {
        throw "Unsupported color: " + s;
    }
    return s;
};
DomManager.prototype.enforceUniqueIds = function (e) {
    var self = this,
        id,
        newId,
        children,
        i;
    
    id = e.getAttribute('id');
    if (id === null) {
        id = e.tagName;
    }
    newId = id;
    
    while (self.nameLookup.hasOwnProperty(newId)) {
        newId = id + self.copyNumber;
        self.copyNumber += 1;
    }
    e.setAttribute('id', newId);
    self.nameLookup[newId] = {
        name : newId,
        itemType : DomManager.getElementType(e)
    };
    
    if (e.tagName === 'g' || e.tagName === 'svg') {
        children = e.childNodes;
        for (i = 0; i < children.length; i += 1) {
            self.enforceUniqueIds(children[i]);
        }
    }
};
DomManager.PATH_SPLITTER = new RegExp('[MmZzLlHhVvCcSsQqTtAa]', 'g');
DomManager.prototype.extractPath = function (g, z) {
    var self = this,
        d = g.getAttribute('d');
        computedStyle = window.getComputedStyle(g),
        output = {
            itemType : 'path',
            name : g.getAttribute('id'),
            zIndex : z,
            fill : self.color(computedStyle.fill),
            stroke : self.color(computedStyle.stroke),
            strokeWidth : parseFloat(computedStyle.strokeWidth),
            opacity : parseFloat(computedStyle.opacity),
            segments : [],
            data : d3.select('#' + g.getAttribute('id')).data()[0],
            classNames : g.getAttribute('class') === null ? "" : g.getAttribute('class'),
            reverseTransform : g.getAttribute('hanpuku_reverseTransform') === null ? "" : g.getAttribute('hanpuku_reverseTransform')
        };
    if (computedStyle.display === "none" || computedStyle.visibility === "hidden") {
        output.fill = 'none';
        output.stroke = 'none';
    }
    if (output.data === undefined) {
        output.data = null;
    }
    output.data = JsonCircular.stringify(output.data);
    
    // standardize() puts spaces around commands, and delimits parameters by single commas...
    d = d.split(' ');
    
    var currentSegment = null,
        lastParams,
        nextParams,
        i = 0;
    while (i < d.length) {
        if (d[i] === 'Z') {
            // End of a segment; nuke the last cubic anchor (standardize() guarantees it will be the same anchor as
            // the first), and set the first anchor's left direction instead
            currentSegment.closed = true;
            currentSegment.points[0].leftDirection = [lastParams[2],
                                                      lastParams[3]];
            i += 1;
        } else if (d[i] === 'M') {
            // Start a new segment
            if (currentSegment !== null) {
                output.segments.push(currentSegment);
            }
            nextParams = d[i+1].split(',');
            nextParams[0] = Number(nextParams[0]);
            nextParams[1] = -Number(nextParams[1]);
            currentSegment = {
                points : [{
                    anchor : nextParams,
                    leftDirection : nextParams,   // We'll assume the segment is not closed (overridden if Z is encountered)
                    rightDirection : nextParams   // If this doesn't get overridden, later just use the anchor
                }],
                closed : false
            };
            i += 2;
        } else {
            // Normal segment
            nextParams = d[i+1].split(',');
            nextParams[0] = Number(nextParams[0]);
            nextParams[1] = -Number(nextParams[1]);
            nextParams[2] = Number(nextParams[2]);
            nextParams[3] = -Number(nextParams[3]);
            nextParams[4] = Number(nextParams[4]);
            nextParams[5] = -Number(nextParams[5]);
            currentSegment.points[currentSegment.points.length - 1].
                rightDirection = [nextParams[0],nextParams[1]];
            currentSegment.points.push({
                anchor : [nextParams[4], nextParams[5]],
                leftDirection : [nextParams[2], nextParams[3]],
                rightDirection : [nextParams[4], nextParams[5]]   // If this doesn't get overridden, later just use the anchor
            });
            i += 2;
        }
        lastParams = nextParams;
    }
    if (currentSegment !== null) {
        output.segments.push(currentSegment);
    }
    return output;
};
DomManager.prototype.extractText = function (t, z) {
    var self = this,
        computedStyle = window.getComputedStyle(t),
        output = {
            itemType : 'text',
            name : t.getAttribute('id'),
            zIndex : z,
            data : d3.select('#' + t.getAttribute('id')).data()[0],
            classNames : t.getAttribute('class') === null ? "" : t.getAttribute('class'),
            reverseTransform : t.getAttribute('hanpuku_reverseTransform') === null ? "" : t.getAttribute('hanpuku_reverseTransform'),
            scaleX : t.getAttribute('hanpuku_scale_x'),
            scaleY : t.getAttribute('hanpuku_scale_y'),
            theta : -t.getAttribute('hanpuku_theta'),
            x : t.getAttribute('x'),
            y : -t.getAttribute('y'),
            contents : t.textContent,
            kerning : t.getAttribute('dx') === null ? "" : t.getAttribute('dx'),
            baselineShift : t.getAttribute('dy') === null ? "" : t.getAttribute('dy'),
            rotate : t.getAttribute('rotate') === null ? "" : t.getAttribute('rotate'),
            fontFamily : computedStyle.fontFamily,
            fontWeight : computedStyle.fontWeight,
            fontSize : computedStyle.fontSize,
            fill : self.color(computedStyle.fill),
            stroke : self.color(computedStyle.stroke),
            strokeWidth : parseFloat(computedStyle.strokeWidth),
            opacity : parseFloat(computedStyle.opacity)
        },
        i;
    if (output.data === undefined) {
        output.data = null;
    }
    output.data = JsonCircular.stringify(output.data);
    
    i = d3.select('#' + output.name).style('text-anchor');
    if (i === 'middle') {
        output.justification = 'CENTER';
    } else if (i === 'end') {
        output.justification = 'RIGHT';
    } else {
        output.justification = 'LEFT';
    }
    
    return output;
};
DomManager.prototype.extractGroup = function (g, z, iType) {
    var self = this,
        output = {
            itemType : iType,
            name : g.getAttribute('id'),
            zIndex : z,
            groups : [],
            paths : [],
            text : []
        },
        s,
        z2 = 1;
    
    if (iType === 'group') {
        output.data = d3.select('#' + g.getAttribute('id')).data()[0];
        if (output.data === undefined) {
            output.data = null;
        }
        output.data = JsonCircular.stringify(output.data);
        output.classNames = g.getAttribute('class') === null ? "" : g.getAttribute('class');
        output.reverseTransform = g.getAttribute('hanpuku_reverseTransform') === null ? "" : g.getAttribute('hanpuku_reverseTransform');
    }
    for (s = 0; s < g.childNodes.length; s += 1) {
        if (g.childNodes[s].tagName === 'g') {
            output.groups.push(self.extractGroup(g.childNodes[s], z2, 'group'));
        } else if (g.childNodes[s].tagName === 'path') {
            output.paths.push(self.extractPath(g.childNodes[s], z2));
        } else if (g.childNodes[s].tagName === 'text') {
            output.text.push(self.extractText(g.childNodes[s], z2));
        } else {
            throw g.childNodes[s].tagName + " is not supported.";
        }
        z2 += 1;
    }
    return output;
};
DomManager.prototype.standardize = function () {
    var self = this,
        currentZoom = jQuery('#' + self.docName).css('zoom');    
    
    self.lastNameLookup = self.nameLookup;
    self.nameLookup = {};
    
    self.enforceUniqueIds(jQuery('svg')[0]);
    
    // Temporarily set the zoom to 100%
    jQuery('#' + self.docName).css('zoom', 1.0);
    
    d3.selectAll('svg').standardize(undefined, true);
    
    jQuery('#' + self.docName).css('zoom', currentZoom);
};
DomManager.prototype.extractDocument = function () {
    var self = this,
        output = {
            itemType : 'document',
            artboards : [],
            layers : [],
            selection : ILLUSTRATOR.selectedIDs,
            exit : []
        },
        s,
        z = 1,
        temp;
    
    self.standardize();
    
    s = jQuery('svg')[0].childNodes;
    for (a = 0; a < s.length; a += 1) {
        temp = s[a].getAttribute('class');
        if (temp !== null && temp.search('artboard') !== -1) {
            temp = s[a].getBBox();  // local coordinates; we want to ignore padding in the widget
            output.artboards.push({
                name: s[a].getAttribute('id'),
                rect: [temp.x, temp.y, temp.x + temp.width, temp.y + temp.height]
            });
            
            // Illustrator has inverted Y coordinates
            temp = output.artboards.length - 1;
            output.artboards[temp].rect[1] = -output.artboards[temp].rect[1];
            output.artboards[temp].rect[3] = -output.artboards[temp].rect[3];
        } else {
            output.layers.push(self.extractGroup(s[a], z, 'layer'));
            z += 1;
        }
    }
    
    for (s in self.lastNameLookup) {
        if (self.lastNameLookup.hasOwnProperty(s)) {
            if (self.nameLookup.hasOwnProperty(s) === false) {
                output.exit.push(self.lastNameLookup[s]);
            }
        }
    }
    
    return output;
};
DomManager.prototype.domToDoc = function () {
    // Throw away all the selection rectangles
    var self = this;
    jQuery('#hanpuku_selectionLayer').remove();
    ILLUSTRATOR.runJSX(self.extractDocument(), 'scripts/domToDoc.jsx', function (result) {});
};

/**
 *
 * docToDom
 *
 **/
DomManager.prototype.docToDom = function () {
    var self = this;
    
    ILLUSTRATOR.runJSX(null, 'scripts/docToDom.jsx', function (result) {
        if (result === "Isolation Mode Error") {
            EXTENSION.displayMessage('<p style="color:#f00;">Can\'t operate in Isolation Mode (an Illustrator bug)</p>');
            result = null;
        }
        if (result !== null) {
            // Set up the document
            self.docName = result.name;
            self.iframe.contentDocument.body.innerHTML = ""; // nuke everything so we start fresh
            
            // Clear out the javascript scope, load the relevant libraries, and init selectedIDs
            ILLUSTRATOR.selectedIDs = result.selection;
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
            
            // Add the layers (just groups)
            var l;
            result.layers = result.layers.sort(phrogz('zIndex'));
            for (l = 0; l < result.layers.length; l += 1) {
                self.addGroup(svg, result.layers[l]);
            }
            
            // Sneaky hack: we set all the REVERSE transforms in the self.addChildLayers()
            // recursive bit; calling standardize on everything will apply all the reverse transforms
            // so that elements will have their native coordinates - and then we can
            // set the new, double-reversed transforms as the regular transform property.
            // This way, everything in d3-land looks like nothing happened to the
            // transform tags, even though the native Illustrator positions were previously
            // baked in. This also collects all the ids in the original document so that
            // we can construct the exit array when we go back
            
            self.standardize();
            
            jQuery('svg g, svg path, svg text').each(function () {
                if (this.hasAttribute('hanpuku_reverseTransform')) {
                    this.setAttribute('transform',this.getAttribute('hanpuku_reverseTransform'));
                    this.removeAttribute('hanpuku_reverseTransform');
                }
            });
            
            
            // Finally, add the selection layer, and update the javascript context
            // (the original D3 selection will have been empty)
            self.iframeScope.selection = ILLUSTRATOR.getD3selection();
            self.updateSelectionLayer();
        } else {
            self.docName = undefined;
            self.viewBounds = undefined;
        }
        EXTENSION.notifyRefresh();
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
    if (path.classNames !== "null") {
        p.attr('class', path.classNames);
    }
    if (path.reverseTransform !== "null") {
        p.attr('transform', path.reverseTransform);
    }
    d3.select('#' + path.name).datum(JsonCircular.parse(JSON.parse(path.data)));
};
DomManager.prototype.addTextLines = function (container, text) {
    var lines = text.split(/\n/),
        lineHeight = 1.1, // ems
        l;
    for (l = 0; l < lines.length; l += 1) {
        container.append('tspan')
            .attr('x', 0)
            .attr('y', l*lineHeight + 'em')
            .text(lines[l]);
    }
};
DomManager.prototype.addText = function (parent, text) {
    var self = this,
        t = parent.append('text')
        .attr('id', text.name)
        .attr('x', text.anchor[0])
        .attr('y', text.anchor[1]),
        container;
    
    if (text.justification === 'LEFT') {
        t.attr('text-anchor', 'start');
    } else if (text.justification === 'CENTER') {
        t.attr('text-anchor', 'middle');
    } else if (text.justification === 'RIGHT') {
        t.attr('text-anchor', 'end');
    } else {
        t.attr('text-anchor', 'start');
    }
    
    if (text.classNames !== 'null') {
        t.attr('class', text.classNames);
    }
    if (text.reverseTransform !== 'null') {
        t.attr('transform', text.reverseTransform);
    }
    
    container = d3.select('#' + text.name);
    container.datum(JsonCircular.parse(JSON.parse(text.data)));
    
    self.addTextLines(container, text.contents);
};
DomManager.prototype.addGroup = function (parent, group) {
    var self = this,
        g = parent.append('g')
        .attr('id', group.name),
        c,
        p,
        t;
    if (group.classNames !== null) {
        g.attr('class', group.classNames);
    }
    if (group.reverseTransform !== null) {
        g.attr('transform', group.reverseTransform);
    }
    if (group.hasOwnProperty('data')) {
        d3.select('#' + group.name).datum(JsonCircular.parse(JSON.parse(group.data)));
    }
    
    group.groups = group.groups.sort(phrogz('zIndex'));
    for (c = 0; c < group.groups.length; c += 1) {
        self.addGroup(g, group.groups[c]);
    }
    group.paths = group.paths.sort(phrogz('zIndex'));
    for (p = 0; p < group.paths.length; p += 1) {
        self.addPath(g, group.paths[p]);
    }
    group.text = group.text.sort(phrogz('zIndex'));
    for (t = 0; t < group.text.length; t += 1) {
        self.addText(g, group.text[t]);
    }
};