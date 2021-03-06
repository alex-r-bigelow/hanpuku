/*jslint evil:true*/
/*globals ejQuery, jQuery, ed3, d3, DATA, EXTENSION, ILLUSTRATOR, JsonCircular, console, convertUnits, phrogz, hanpuku, document, window, alert*/

/*
 * The purpose of this class is to act as an intermediary between
 * Illustrator and a mirror DOM that the GUI manipulates and that
 * d3.js code and CSS operate on.
 */

function DomManager() {
    "use strict";
    var self = this,
        element,
        targetDiv;
    
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
    element.innerText = "text { font-family: 'Myriad Pro',sans-serif; font-size: 12px; }";
    
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
    
    self.animationFrame = null;
    self.interval = null;
    self.timeout = null;
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
DomManager.NOOP = function () {
    "use strict";
};
DomManager.COMPARE_Z = function (a, b) {
    "use strict";
    return a.zIndex - b.zIndex;
};
DomManager.ALPHABETIC = new RegExp('[A-Za-z]');
DomManager.INVALID = new RegExp('[^A-Za-z0-9-_]', 'g');
// Technically, HTML ids are pretty permissive, however, jQuery chokes on periods and colons

DomManager.getElementType = function (e) {
    "use strict";
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
    "use strict";
};
DomManager.prototype.disableUI = function () {
    "use strict";
    var self = this;
    ejQuery('#zoomButtons button').attr('disabled', true);
    self.iframe.contentDocument.body.innerHTML = "";
};
DomManager.prototype.onRefresh = function () {
    "use strict";
    ejQuery('#zoomButtons button').attr('disabled', false);
};
DomManager.prototype.zoomIn = function () {
    "use strict";
    var self = this,
        current = jQuery('#' + self.docName).css('zoom'),
        newZoom = current * 2;
    if (newZoom > 64) {
        newZoom = 64;
    }
    jQuery('#' + self.docName).css('zoom', newZoom);
    ejQuery('#zoomButtons span').text((newZoom * 100) + "%");
};
DomManager.prototype.zoomOut = function () {
    "use strict";
    var self = this,
        current = jQuery('#' + self.docName).css('zoom'),
        newZoom = current / 2;
    if (newZoom < 0.03125) {
        newZoom = 0.03125;
    }
    jQuery('#' + self.docName).css('zoom', newZoom);
    ejQuery('#zoomButtons span').text((newZoom * 100) + "%");
};
DomManager.prototype.initScope = function () {
    "use strict";
    var self = this,
        s,
        scriptCallback = function (script) {
            self.runScript(script, true);
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
    /*jslint nomen: true*/
    d3._text = d3.text;
    d3.text = DATA.createLoadingFunction(d3._text);
    d3._json = d3.json;
    d3.json = DATA.createLoadingFunction(d3._json);
    d3._xml = d3.xml;
    d3.xml = DATA.createLoadingFunction(d3._xml);
    d3._html = d3.html;
    d3.html = DATA.createLoadingFunction(d3._html);
    d3._csv = d3.csv;
    d3.csv = DATA.createLoadingFunction(d3._csv);
    d3._tsv = d3.tsv;
    d3.tsv = DATA.createLoadingFunction(d3._tsv);
    //d3._js = d3.js;
    d3.js = DATA.createLoadingFunction(null);
    /*jslint nomen: false*/
};
DomManager.prototype.runScript = function (script, ignoreSelection) {
    "use strict";
    var self = this,
        error,
        animationFrame,
        timeout,
        interval,
        i;
    
    if (ignoreSelection !== true) {
        // remove our selection layer
        jQuery('#hanpuku_selectionLayer').remove();
    }
    
    // any "processes" created from this point need to be stopped before we standardize
    self.animationFrame = window.requestAnimationFrame(DomManager.NOOP);
    self.timeout = window.setTimeout(DomManager.NOOP);
    self.interval = window.setInterval(DomManager.NOOP);
    
    // execute script in private context - not for security, but
    // for a cleaner scope that feels more like coding in a normal browser
    error = (new Function("try{ with(this) { " + script +
                "} } catch(e) { console.warn(e.stack); var temp = e.stack.split('\\n'); " +
                "return [temp[0], temp[1].split(':')[4]]; } return null;")).call(self.iframeScope);
    if (error !== null) {
        EXTENSION.displayError('Your script had an error: ' + error[0] + ' on line ' + error[1]);
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
    "use strict";
    var self = this,
        layer,
        selectionRect;
    
    jQuery('#hanpuku_selectionLayer').remove();
    layer = d3.select('#' + self.docName).append('g')
              .attr('id', 'hanpuku_selectionLayer');
    selectionRect = layer.selectAll('path').data(ILLUSTRATOR.selectedIDs);
    selectionRect.enter().append('path')
        .attr('fill', 'none')
        .attr('stroke-width', '1px')
        .attr('stroke', 'rgb(98,131,255)')
        .attr('d', function (d) {
            var bounds = self.iframe.contentDocument.getElementById(d).getBoundingClientRect();
            // I don't use getBBox() because we might be overlaying something inside a group
            // and the overlay paths need to be at the root level so we can add/remove them
            // easily. That said, we need to account for the svg element's viewBounds, as well as
            // the iframe's scroll position
            bounds = {
                left : bounds.left + self.viewBounds.left + self.iframe.contentWindow.pageXOffset,
                top : bounds.top + self.viewBounds.top + self.iframe.contentWindow.pageYOffset,
                right : bounds.right + self.viewBounds.left + self.iframe.contentWindow.pageXOffset,
                bottom : bounds.bottom + self.viewBounds.top + self.iframe.contentWindow.pageYOffset
            };
            
            return "M" + (bounds.left) + "," + (bounds.top) +
                   "L" + (bounds.right) + "," + (bounds.top) +
                   "L" + (bounds.right) + "," + (bounds.bottom) +
                   "L" + (bounds.left) + "," + (bounds.bottom) +
                   "Z";
        });
};
DomManager.prototype.unifySvgTags = function (svgNode) {
    "use strict";
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
    artboard = jQuery(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
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
    groupNode = document.createElementNS('http://www.w3.org/2000/svg', 'g');
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
    "use strict";
    if (s[0] === '#') {
        // Stolen from http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        s = s.replace(DomManager.SHORTHAND_REGEX, function (m, r, g, b) {
            s = r + r + g + g + b + b;
        });
        
        var result = DomManager.HEX_PARSING_REGEX.exec(s);
        s = 'rgb(' + parseInt(result[1], 16) + ', ' +
                     parseInt(result[2], 16) + ', ' +
                     parseInt(result[3], 16) + ')';
    }
    if (s !== 'none' && s.substring(0, 4) !== 'rgb(') {
        throw "Unsupported color: " + s;
    }
    return s;
};
DomManager.prototype.enforceUniqueIds = function (e) {
    "use strict";
    var self = this,
        id,
        newId,
        children,
        i;
    
    id = e.getAttribute('id');
    if (id === null) {
        id = e.tagName;
    }
    if (DomManager.ALPHABETIC.test(id.charAt(0)) !== true) {
        // HTML ids must start with an alphabetic
        id = e.tagName + '_' + id;
    }
    // Enforce strict rules about valid characters (for jQuery's sake)
    id = id.replace(DomManager.INVALID, '_');
    
    newId = id;
    
    while (self.nameLookup.hasOwnProperty(newId)) {
        newId = id + '_' + self.copyNumber;
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
    "use strict";
    var self = this,
        d = g.getAttribute('d'),
        computedStyle = window.getComputedStyle(g),
        currentSegment,
        lastParams,
        nextParams,
        i,
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
    d = d !== null ? d.split(' ') : [];
    
    currentSegment = null;
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
            nextParams = d[i + 1].split(',');
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
        } else if (d[i] === 'C') {
            // Normal segment
            nextParams = d[i + 1].split(',');
            nextParams[0] = Number(nextParams[0]);
            nextParams[1] = -Number(nextParams[1]);
            nextParams[2] = Number(nextParams[2]);
            nextParams[3] = -Number(nextParams[3]);
            nextParams[4] = Number(nextParams[4]);
            nextParams[5] = -Number(nextParams[5]);
            currentSegment.points[currentSegment.points.length - 1].
                rightDirection = [nextParams[0], nextParams[1]];
            currentSegment.points.push({
                anchor : [nextParams[4], nextParams[5]],
                leftDirection : [nextParams[2], nextParams[3]],
                rightDirection : [nextParams[4], nextParams[5]]   // If this doesn't get overridden, later just use the anchor
            });
            i += 2;
        } else {
            console.warn(i, d, d[i]);
            throw "Bad d string";
        }
        lastParams = nextParams;
    }
    if (currentSegment !== null) {
        output.segments.push(currentSegment);
    }
    return output;
};
DomManager.prototype.extractText = function (t, z) {
    "use strict";
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
            x : t.getAttribute('hanpuku_x'),
            y : -t.getAttribute('hanpuku_y'),
            internalX : t.hasAttribute('x') ? t.getAttribute('x') : 0,
            internalY : t.hasAttribute('y') ? t.getAttribute('y') : 0,
            contents : t.textContent,
            kerning : t.getAttribute('dx') === null ? "" : t.getAttribute('dx'),
            baselineShift : t.getAttribute('dy') === null ? "" : t.getAttribute('dy'),
            rotate : t.getAttribute('rotate') === null ? "" : t.getAttribute('rotate'),
            fontFamilies : computedStyle.fontFamily.split(','),
            fontStyle : computedStyle.fontStyle,
            fontWeight : computedStyle.fontWeight,
            fontSize : convertUnits(t, computedStyle.fontSize, "px"),   // weirdly, px in browser land actually means pt
            fontVariant : computedStyle.fontVariant,
            // fontStretch : computedStyle.fontStretch, // TODO: still unsupported in Chrome
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
    "use strict";
    var self = this,
        computedStyle = window.getComputedStyle(g),
        output = {
            itemType : iType,
            name : g.getAttribute('id'),
            zIndex : z,
            groups : [],
            paths : [],
            text : [],
            opacity : parseFloat(computedStyle.opacity)
        },
        s,
        z2 = 1;
    output.opacity = isNaN(output.opacity) ? 1 : output.opacity;
    
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
    "use strict";
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
    "use strict";
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
        temp,
        a;
    
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
DomManager.prototype.domToDoc = function (callback) {
    "use strict";
    var self = this,
        i;
    
    // Need to clear out any "processes" that are running (like a force-directed layout)
    if (self.animationFrame !== null) {
        for (i = window.requestAnimationFrame(DomManager.NOOP); i > self.animationFrame; i -= 1) {
            window.cancelAnimationFrame(i);
        }
    }
    self.animationFrame = null;
    if (self.interval !== null) {
        for (i = window.setInterval(DomManager.NOOP); i > self.interval; i -= 1) {
            window.clearInterval(i);
        }
    }
    self.interval = null;
    if (self.timeout !== null) {
        for (i = window.setTimeout(DomManager.NOOP); i > self.timeout; i -= 1) {
            if (i !== EXTENSION.combinedApplyTimeout) {
                window.clearTimeout(i);
            }
        }
    }
    self.timeout = null;
    
    // Throw away all the selection overlay rectangles
    jQuery('#hanpuku_selectionLayer').remove();
    
    callback = callback === undefined ? function () {} : callback;
    ILLUSTRATOR.runJSX(self.extractDocument(), 'scripts/domToDoc.jsx', callback,
        function (error) {
            // Something went wrong...
            if (error.message.search('Hanpuku ') === 0) {
                EXTENSION.displayWarning(error.message);
            } else {
                throw error;
            }
        });
};

/**
 *
 * docToDom
 *
 **/
DomManager.prototype.docToDom = function (callback) {
    "use strict";
    var self = this;
    
    ILLUSTRATOR.runJSX(null, 'scripts/docToDom.jsx', function (result) {
        var svg,
            artboards,
            l,
            temp;
        
        if (result === "Isolation Mode Error") {
            EXTENSION.displayError('Hanpuku can\'t operate in Isolation Mode (an Illustrator bug)');
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
                .style('margin', '0')
                .style('background-color', EXTENSION.bodyColor);
            
            svg = d3.select('body').append('svg')
                .attr('id', result.name)
                .attr('width', self.viewBounds.width)
                .attr('height', self.viewBounds.height)
                .attr('viewBox', (self.viewBounds.left) + ' ' + (self.viewBounds.top) + ' ' +
                                  (self.viewBounds.width) + ' ' + (self.viewBounds.height))
                .attr('zoom', '100%');
            
            // Add the artboards
            artboards = svg.selectAll('.artboard').data(result.artboards);
            artboards.enter().append('rect')
                .attr('class', 'artboard');
            artboards.attr('id', phrogz('name'))
                .attr('x', function (d) { return d.rect[0]; })
                .attr('y', function (d) { return d.rect[1]; })
                .attr('width', function (d) { return d.rect[2] - d.rect[0]; })
                .attr('height', function (d) { return d.rect[3] - d.rect[1]; })
                .attr('fill', '#fff')
                .attr('stroke-width', 1)
                .attr('stroke', '#000');
            
            // Add the layers (just groups)
            result.layers = result.layers.sort(DomManager.COMPARE_Z);
            for (l = 0; l < result.layers.length; l += 1) {
                self.addGroup(svg, result.layers[l]);
            }
            
            // Sneaky hack: we set all the REVERSE transforms in the self.addChildLayers()
            // recursive bit; calling standardize on everything will apply all the reverse transforms
            // so that elements will have their native coordinates - and then we can
            // set the new, double-reversed transforms as the regular transform property.
            // This way, everything in d3-land looks like nothing happened to the
            // transform tags, even though the native Illustrator positions were previously
            // baked in.
            
            self.standardize();
            
            jQuery('svg g, svg path, svg text').each(function () {
                if (this.hasAttribute('hanpuku_reverseTransform')) {
                    this.setAttribute('transform', this.getAttribute('hanpuku_reverseTransform'));
                }
                
                // In addition to switching transform tags, we want to get as
                // close to the original, non-standard SVG as we can:
                
                // Restore internal text x,y coordinates
                if (this.hasAttribute('hanpuku_internalX')) {
                    temp = Number(this.getAttribute('hanpuku_internalX'));
                    if (!isNaN(temp)) {
                        this.setAttribute('x', temp);
                    }
                }
                if (this.hasAttribute('hanpuku_internalY')) {
                    temp = Number(this.getAttribute('hanpuku_internalY'));
                    if (!isNaN(temp)) {
                        this.setAttribute('y', temp);
                    }
                }
                // Apply additional Illustrator transformations to text (other Illustrator
                // transformations are preserved in geometry coordinates)
                temp = "";
                if (this.hasAttribute('hanpuku_prependTransform')) {
                    temp += this.getAttribute('hanpuku_prependTransform');
                }
                if (this.hasAttribute('transform')) {
                    temp += this.getAttribute('transform');
                }
                if (this.hasAttribute('hanpuku_appendTransform')) {
                    temp += this.getAttribute('hanpuku_appendTransform');
                }
                this.setAttribute('transform', temp);
                // Purge any tags leftover from standardize (by switching transform
                // tags, we just converted it back to as close to the original,
                // non-standard SVG as we could
                this.removeAttribute('hanpuku_reverseTransform');
                this.removeAttribute('hanpuku_nonNativeTransform');
                this.removeAttribute('hanpuku_scale_x');
                this.removeAttribute('hanpuku_scale_y');
                this.removeAttribute('hanpuku_theta');
                this.removeAttribute('hanpuku_x');
                this.removeAttribute('hanpuku_y');
                this.removeAttribute('hanpuku_internalX');
                this.removeAttribute('hanpuku_internalY');
                this.removeAttribute('hanpuku_appendTransform');
                this.removeAttribute('hanpuku_prependTransform');
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
        if (callback !== undefined) {
            callback();
        }
    }, function (error) {
        // Something went wrong...
        if (error.message.search('Hanpuku ') === 0) {
            EXTENSION.displayWarning(error.message);
        } else {
            throw error;
        }
    });
};
DomManager.prototype.extractPathString = function (segments) {
    "use strict";
    var p,
        point,
        d = "",
        s;
    
    for (s = 0; s < segments.length; s += 1) {
        point = segments[s].points[0];
        d += "M " + point.anchor[0] + "," + point.anchor[1];
        
        for (p = 1; p < segments[s].points.length; p += 1) {
            point = segments[s].points[p];
            
            d += " C " + segments[s].points[p - 1].rightDirection[0] + "," +
                       segments[s].points[p - 1].rightDirection[1] + "," +
                       point.leftDirection[0] + "," + point.leftDirection[1] + "," +
                       point.anchor[0] + "," + point.anchor[1];
        }
        if (segments[s].closed === true) {
            d += " C " + segments[s].points[segments[s].points.length - 1].rightDirection[0] + "," +
                       segments[s].points[segments[s].points.length - 1].rightDirection[1] + "," +
                       segments[s].points[0].leftDirection[0] + "," +
                       segments[s].points[0].leftDirection[1] + "," +
                       segments[s].points[0].anchor[0] + "," +
                       segments[s].points[0].anchor[1];
            d += " Z ";
        }
    }
    
    return d;
};
DomManager.prototype.addPath = function (parent, path) {
    "use strict";
    var self = this,
        p = parent.append('path')
            .attr('id', path.name)
            .attr('d', self.extractPathString(path.segments))
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
DomManager.prototype.addText = function (parent, text) {
    "use strict";
    var t = parent.append('text')
        .attr('id', text.name)
        .text(text.contents),   // I deliberately don't support SVG line breaks (the SVG will display improperly - see the documentation)
        temp,
        diffMatrix,
        sinTheta,
        cosTheta,
        container;
    
    // Justification
    if (text.justification === 'LEFT') {
        t.attr('text-anchor', 'start');
    } else if (text.justification === 'CENTER') {
        t.attr('text-anchor', 'middle');
    } else if (text.justification === 'RIGHT') {
        t.attr('text-anchor', 'end');
    } else {
        t.attr('text-anchor', 'start');
    }
    
    // Font properties (it's important to set these BEFORE figuring out .internalX and .internalY, in case
    // they use em units)
    t.style('font-size', text.fontSize)
        .style('font-family', text.fontFamily);
    
    if (text.classNames !== 'null') {
        t.attr('class', text.classNames);
    }
    
    // Transformations
    
    if (text.reverseTransform !== 'null') {
        t.attr('transform', text.reverseTransform);
    }
    
    text.internalX = !text.internalX ? '0' : text.internalX;
    text.internalY = !text.internalY ? '0' : text.internalY;
    
    text.internalX = parseFloat(convertUnits(t[0][0], text.internalX, 'px')); // need to send the actual DOM element, not the d3 selection
    text.internalY = parseFloat(convertUnits(t[0][0], text.internalY, 'px'));
    if (text.x_0 === null) {
        // This is a new item! Append the absolute transformation BEFORE
        // the reverseTransform has been reversed in the docToDom hack
        
        t.attr('hanpuku_prependTransform', 'translate(' + text.x_1 + ',' + (-text.y_1) + ')' +
                                           'rotate(' + (-180 * text.theta_1 / Math.PI) + ')' +
                                           'scale(' + text.scale_x_1 + ',' + text.scale_y_1 + ')');
    } else {
        // Extract any transformation changes that were made in Illustrator,
        // and prepend them to the transform attribute AFTER the reverseTransform
        // has been reversed in the docToDom hack
        
        t.attr('hanpuku_appendTransform', 'translate(' + (text.x_1 - text.x_0) +
                                        ',' + (text.y_0 - text.y_1) + ')' +
                                        'rotate(' + (180 * (text.theta_1 - text.theta_0) / Math.PI) +
                                        ',' + text.internalX +
                                        ',' + text.internalY + ')' +
                                        'scale(' + (text.scale_x_1 / text.scale_x_0) +
                                        ',' + (text.scale_y_1 / text.scale_y_0) + ')');
    }
    
    // Kerning
    if (text.kerning !== "") {
        t.attr('dx', text.kerning);
    }
    
    // Baseline shift
    if (text.baselineShift !== "") {
        t.attr('dy', text.baselineShift);
    }
    
    // Rotate
    if (text.rotate !== "") {
        t.attr('rotate', text.rotate);
    }
    
    // Restore the internal x and y coordinates
    t.attr('hanpuku_internalX', text.internalX);
    t.attr('hanpuku_internalY', text.internalY);
    
    container = d3.select('#' + text.name);
    container.datum(JsonCircular.parse(JSON.parse(text.data)));
};
DomManager.prototype.addGroup = function (parent, group) {
    "use strict";
    var self = this,
        g = parent.append('g')
            .attr('id', group.name)
            .style('opacity', group.opacity),
        children = group.groups.concat(group.paths).concat(group.text).sort(DomManager.COMPARE_Z),
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
    
    for (c = 0; c < children.length; c += 1) {
        if (children[c].itemType === 'group') {
            self.addGroup(g, children[c]);
        } else if (children[c].itemType === 'path') {
            self.addPath(g, children[c]);
        } else if (children[c].itemType === 'text') {
            self.addText(g, children[c]);
        } else {
            console.warn(children[c]);
            throw "Unknown itemType: " + children[c];
        }
    }
};

/*
 * Import / export HTML
 **/
function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
DomManager.prototype.exportHTML = function () {
    "use strict";
    var self = this,
        contentDoc = ejQuery('#domPreviewContent > iframe')[0].contentDocument,
        allNodes = contentDoc.getElementsByTagName('*'),
        node,
        datum,
        i,
        result,
        filePath = window.cep.fs.showSaveDialogEx("Export HTML",
                    "", ["html"], self.docName + ".html", "", "Save", "File name:").data;
    for (i = 0; i < allNodes.length; i += 1) {
        node = d3.select(allNodes[i]);
        datum = node.datum();
        if (datum === undefined) {
            node.attr('__data__', null);
        } else {
            node.attr('__data__', JSON.stringify(datum));
        }
    }
    
    result = window.cep.fs.writeFile(filePath,
        '<!DOCTYPE html><html><head>\n' +
        contentDoc.head.innerHTML +
        '</head><body>' +
        contentDoc.body.innerHTML +
        '</body></html>');
    
    if (result.err !== 0){
        alert("Sorry, something went wrong when trying to save the file.");
    }
};
DomManager.prototype.importHTML = function () {
    "use strict";
    var self = this,
        filePath = window.cep.fs.showOpenDialogEx(false, false, "Import HTML", "", ["html"], "", "OK").data[0],
        result = window.cep.fs.readFile(filePath).data,
        contentDoc = ejQuery('#domPreviewContent > iframe')[0].contentDocument,
        allNodes,
        i,
        node,
        datum;
    
    contentDoc.write(result);
    
    allNodes = contentDoc.getElementsByTagName('*');
    
    for (i = 0; i < allNodes.length; i += 1) {
        node = d3.select(allNodes[i]);
        datum = node.attr('__data__');
        if (datum !== null) {
            node.datum(JSON.parse(datum));
        }
        node.attr('__data__', null);
    }
};
DomManager.prototype.combinedExportHTML = function () {
    "use strict";
    var self = this;
};
DomManager.prototype.combinedImportHTML = function () {
    var self = this;
};