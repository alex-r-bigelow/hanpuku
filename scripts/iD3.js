/**
 * Monkey-patches additional functionality onto d3.js for making transitions to and from
 * Illustrator documents easier, as well as adding some Illustrator-like functionality to d3.js
 */
(function () {
    /* General-purpose functions */
    var pathSplitter = new RegExp('[MmZzLlHhVvCcSsQqTtAa]', 'g');
    
    function matMultiply(left, right) {
        // SVG matrix format:
        // 0 2 4
        // 1 3 5
        // - - -
        
        // Illustrator matrix format:
        // mValueA mValueC mValueTX
        // mValueB mValueD mValueTY
        // - - -
        return [
            left[0]*right[0] + left[2]*right[1],    // + left[4]*0
            left[1]*right[0] + left[3]*right[1],    // + left[5]*0
            left[0]*right[2] + left[2]*right[3],    // + left[4]*0
            left[1]*right[2] + left[3]*right[3],    // + left[5]*0
            left[0]*right[4] + left[2]*right[5] + left[4],  //*1
            left[1]*right[4] + left[3]*right[5] + left[5]   //*1
        ];
    }
    
    function matInvert(m) {
        // Inverse of SVG matrix (per WolframAlpha, because I'm lazy)
        
        // d/(ad-bc)    c/(bc-ad)   (de-cf)/(bc-ad)
        // b/(bc-ad)    a/(ad-bc)   (be-af)/(ad-bc)
        //     0            0              1
        
        var adbc = m[0]*m[3]-m[1]*m[2],
            bcad = -adbc;
        return [
            m[3]/adbc,
            m[1]/bcad,
            m[2]/bcad,
            m[0]/adbc,
            (m[3]*m[4] - m[2]*m[5])/bcad,
            (m[1]*m[5] - m[0]*m[4])/adbc
        ];
    }
    
    function matPoint(m, x, y) {
        return [
            m[0]*x + m[2]*y + m[4],
            m[1]*x + m[3]*y + m[5]
        ];
    }
    
    /* Helper functions for converting circles, rectangles, paths, and any object
     * to cubic-interpolated paths with absolute coordinates (no nested transforms) */
    function pathToCubicPath(d, m) {
        var pointTypes = d.match(pathSplitter),
            coordList = d.split(pathSplitter).splice(1),
            coords,
            temp,
            lastAnchor;
        
        if (m === undefined) {
            m = [1,0,0,1,0,0];
        }
        
        d = "";
        
        // First convert H and V to L
        for (i = 0; i < pointTypes.length; i += 1) {
            if (pointTypes[i] === 'H') {
                pointTypes[i] = 'L';
                temp = coordList[i-1].split(',');
                coordList[i] = coordList[i] + ',' + temp[temp.length - 1];
            } else if (pointTypes[i] === 'V') {
                pointTypes[i] = 'L';
                temp = coordList[i-1].split(',');
                coordList[i] = temp[temp.length - 2] + ',' + coordList[i];
            }
        }
        
        function parsePairList(list) {
            list = list.split(',');
            var result = [],
                j;
            for (j = 0; j < list.length; j += 2) {
                result.push(matPoint(m, list[j], list[j + 1]).join(','));
            }
            return result;
        }
        
        for (i = 0; i < pointTypes.length; i += 1) {
            if (pointTypes[i].toUpperCase() !== pointTypes[i]) {
                throw 'no support for relative point ' + pointTypes[i] + ' yet';
            }
            
            if (i === 0) {
                if (pointTypes[i] === 'M') {
                    coords = parsePairList(coordList[i]);
                    d += "M" + coords[0];
                } else {
                    throw 'paths must start with M';
                }
            } else if (pointTypes[i] === 'C') {
                coords = parsePairList(coordList[i]);
                d += "C" + coords.join(',');
            } else if (pointTypes[i] === 'Z') {
                d += "Z";
            } else if (pointTypes[i] === 'L') {
                temp = parsePairList(coordList[i-1]);
                lastAnchor = temp[temp.length - 1];
                coords = parsePairList(coordList[i]);
                d += "C" + lastAnchor + ',' +
                           coords[0] + ',' +
                           coords[0];
            } else if (pointTypes[i] === 'Q') {
                coords = parsePairList(coordList[i]);
                d += "C" + coords[0] + ',' +
                           coords[0] + ',' +
                           coords[1];
            } else {
                throw 'no support yet for path point ' + pointTypes[i];
            }
        }
        
        return d;
    }
    
    function lineToCubicPath(x1, y1, x2, y2, m) {
        return  pathToCubicPath(
            "M" + x1 + "," + y1 +
            "L" + x2 + "," + y2 +
            "Z",
        m);
    }
    
    function rectToCubicPath(x, y, width, height, m) {
        return  pathToCubicPath(
            "M" + x + "," + y +
            "L" + (x + width) + "," + y +
            "L" + (x + width) + "," + (y + height) +
            "L" + x + "," + (y + height) +
            "L" + x + "," + y +
            "Z",
        m);
    }
    
    function circleToCubicPath(cx, cy, r, m) {
        return  pathToCubicPath(
            "M" + cx + "," + (cy - r) +    // top
            "C" + (cx + r / 2) + "," + (cy - r) + "," +
                  (cx + r) + "," + (cy - r / 2) + "," +
                  (cx + r) + "," + cy +    // right
            "C" + (cx + r) + "," + (cy + r / 2) + "," +
                  (cx + r / 2) + "," + (cy + r) + "," +
                  cx + "," + (cy + r) +    // bottom
            "C" + (cx - r / 2) + "," + (cy + r) + "," +
                  (cx - r) + "," + (cy + r / 2) + "," +
                  (cx - r) + "," + cy +    // left
            "C" + (cx - r) + "," + (cy - r / 2) + "," +
                  (cx - r / 2) + "," + (cy - r) + "," +
                  cx + "," + (cy - r) +    // top
            "Z",
        m);
    }
    
    function elementToCubicPaths(e, m, preserveReverseTransforms) {
        var transform,
            reverseTransform,
            stringMode,
            params,
            i,
            d = null,
            replaceNodeAttrs = null,
            newNode,
            a,
            data,
            id = e.getAttribute('id');
        
        // Apply all transformations
        if (m === undefined) {
            m = [1,0,0,1,0,0];
        }
        transform = e.getAttribute('transform');
        
        if (transform && transform !== "null") {
            transform = transform.split('(');
            stringMode = transform[0].trim().toLowerCase();
            params = transform[1].substring(0, transform[1].length - 1).split(',');
                        
            if (stringMode === 'translate') {
                reverseTransform = 'translate(' + (-params[0]) + ',' + (-params[1]) + ')';
                m = matMultiply(m, [1,0,0,1,Number(params[0]),Number(params[1])]);
            } else if (stringMode === 'matrix') {
                reverseTransform = 'matrix(' + matInvert(params).join(',') + ')';
                m = matMultiply(m, params);
            } else if (stringMode === 'rotate') {
                reverseTransform = 'rotate(' + (-params[0]) + ')';
                params[0] = params[0]*Math.PI / 180;    // convert to radians
                m = matMultiply(m, [Math.cos(params[0]),
                                    Math.sin(params[0]),
                                    -Math.sin(params[0]),
                                    Math.cos(params[0]),
                                    0,
                                    0]);
            } else {
                throw stringMode + ' transforms are not yet supported.';
            }
            
            e.removeAttribute('transform');
            if (preserveReverseTransforms) {
                e.setAttribute('id3_reverseTransform', reverseTransform);
            }
        }
        
        // Get a cubic-interpolated path string for each element type, or recurse if a group
        if (e.tagName === 'rect') {
            // Convert rect to cubic-interpolated path
            d = rectToCubicPath(Number(e.getAttribute('x')),
                                Number(e.getAttribute('y')),
                                Number(e.getAttribute('width')),
                                Number(e.getAttribute('height')),
                                m);
            replaceNodeAttrs = ['x','y','width','height'];
        } else if (e.tagName === 'circle') {
            // Convert circle to cubic-interpolated path
            d = circleToCubicPath(Number(e.getAttribute('cx')),
                                  Number(e.getAttribute('cy')),
                                  Number(e.getAttribute('r')),
                                  m);
            replaceNodeAttrs = ['cx','cy','r'];
        } else if (e.tagName === 'line') {
            d = lineToCubicPath(Number(e.getAttribute('x1')),
                                Number(e.getAttribute('y1')),
                                Number(e.getAttribute('x2')),
                                Number(e.getAttribute('y2')),
                                m);
            replaceNodeAttrs = ['x1','y1','x2','y2'];
        } else if (e.tagName === 'path') {
            d = pathToCubicPath(e.getAttribute('d'), m);
        } else if (e.tagName === 'g' || e.tagName === 'svg') {
            for (i = 0; i < e.childNodes.length; i += 1) {
                elementToCubicPaths(e.childNodes[i], m, preserveReverseTransforms);
            }
        } else if (e.tagName === 'text') {
            // I'll need to hack the transformation matrices
            // for text when I actually convert
            e.setAttribute('transform','matrix(' + m.join(',') + ')');
        } else {
            throw 'iD3 doesn\'t yet support tag ' + e.tagName;
        }
        
        // Do we need to change the actual element? Copy its attributes and d3-assigned
        // data to a new path element. Don't copy attributes that are being replaced
        // by the path d attribute
        if (replaceNodeAttrs !== null) {
            newNode = document.createElementNS(e.namespaceURI,'path');
            for (a in e.attributes) {
                if (e.attributes.hasOwnProperty(a) &&
                        a !== 'length') {
                    if (replaceNodeAttrs.indexOf(e.attributes[a].nodeName) === -1) {
                        newNode.setAttribute(e.attributes[a].nodeName, e.attributes[a].value);
                    }
                }
            }
            
            data = d3.select('#' + id).data();
            e.parentNode.replaceChild(newNode,e);
            d3.select('#' + id).data(data);
            e = newNode;
        }
        
        // Finally, set the d attribute (ignore if a group)
        if (d !== null) {
            e.setAttribute('d', d);
        }
        
        return e;
    }
    
    /* Monkey-patched functions */
    /* These are important to allow d3 to work with a DOM that has
       gone through Illustrator; Illustrator applies all transforms
       immediately instead of as an attribute, and every shape is
       a cubic-interpolated path. These monkey-patched functions
       apply transforms behind the scenes and convert shapes to
       cubic-interpolated paths */
    
    d3.selection.prototype.appendClone = function (idToClone) {
        var self = this;
        
        function constructClone (proto, clone) {
            var a,
                attrib,
                c,
                child,
                copyId,
                copyNumber = 1;
            
            for (a in proto.attributes) {
                if (proto.attributes.hasOwnProperty(a) && a !== 'length') {
                    attrib = proto.attributes[a].name;
                    if (attrib === 'id') {
                        copyId = proto.getAttribute(attrib) + "Copy" + copyNumber;
                        while (document.getElementById(copyId) !== null) {
                            copyNumber += 1;
                            copyId = proto.getAttribute(attrib) + "Copy" + copyNumber;
                        }
                        clone.attr('id', copyId);
                    } else {
                        clone.attr(attrib, proto.getAttribute(attrib));
                    }
                }
            }
            
            for (c = 0; c < proto.childNodes.length; c += 1) {
                child = clone.append(proto.childNodes[c].tagName);
                constructClone(proto.childNodes[c], child);
            }
        }
        
        if (typeof idToClone === 'function') {
            var clones = [];
            self.each(function (d, i) {
                var proto = document.getElementById(idToClone.call(this, d)),
                    clone = d3.select(this).append(proto.tagName);
                constructClone(proto, clone);
                clones.push(clone[0][0]);
            });
            return d3.selectAll(clones);
        } else {
            var proto = document.getElementById(idToClone),
                clone = self.append(proto.tagName);
            constructClone(proto, clone);
            return clone;
        }
    };
    d3.selection.enter.prototype.appendClone = d3.selection.prototype.appendClone;
    
    d3.selection.prototype.appendCircle = function (cx, cy, r) {
        var self = this;
        return self.append('path')
            .attr('d', function (d, i) {
                var d_cx = typeof cx === 'function' ? cx.call(this, d, i) : cx,
                    d_cy = typeof cy === 'function' ? cy.call(this, d, i) : cy,
                    d_r = typeof r === 'function' ? r.call(this, d, i) : r;
                return circleToCubicPath(d_cx, d_cy, d_r);
            });
    };
    d3.selection.enter.prototype.appendCircle = d3.selection.prototype.appendCircle;
    
    d3.selection.prototype.appendRect = function (x, y, width, height) {
        var self = this;
        return self.append('path')
            .attr('d', function (d, i) {
                var d_x = typeof x === 'function' ? x.call(this, d, i) : x,
                    d_y = typeof y === 'function' ? y.call(this, d, i) : y,
                    d_width = typeof width === 'function' ? width.call(this, d, i) : width,
                    d_height = typeof height === 'function' ? height.call(this, d, i) : height;
                return rectToCubicPath(d_x, d_y, d_width, d_height);
            });
    };
    d3.selection.enter.prototype.appendRect = d3.selection.prototype.appendRect;
    
    d3.selection.prototype.appendPath = function (d) {
        var self = this;
        return self.append('path')
            .attr('d', function (data, i) {
                var d_d = typeof d === 'function' ? d.call(this, data, i) : d;
                return pathToCubicPath(d_d);
            });
    };
    d3.selection.enter.prototype.appendPath = d3.selection.prototype.appendPath;
    
    /**
     * Extra goodies monkey-patched on to selections only (useful for manipulating
     * selections with existing objects more like Illustrator)
     */
    d3.selection.prototype.toCubicPaths = function (m, preserveReverseTransforms) {
        var self = this;
        self.each(function (d, i) {
            var e = this;
            elementToCubicPaths(e, m, preserveReverseTransforms);
        });
    };
    d3.ANCHORS = {
        'TOP_LEFT' : 0,
        'TOP_CENTER' : 1,
        'TOP_RIGHT' : 2,
        'MIDDLE_LEFT' : 3,
        'MIDDLE_CENTER' : 4,
        'MIDDLE_RIGHT' : 5,
        'BOTTOM_LEFT' : 6,
        'BOTTOM_CENTER' : 7,
        'BOTTOM_RIGHT' : 8
    };
    var ANCHOR_OFFSET = {
        0 : [-0.5,-0.5],
        1 : [0,-0.5],
        2 : [0.5,-0.5],
        3 : [-0.5,0],
        4 : [0,0],
        5 : [0.5,0],
        6 : [-0.5,0.5],
        7 : [0,0.5],
        8 : [0.5,0.5]
    };
    d3.selection.prototype.setGlobalPosition = function (x, y, anchor) {
        var self = this;
        if (anchor === undefined) {
            anchor = d3.ANCHORS.MIDDLE_CENTER;
        }
        return self.setGlobalTransform(function (d, i, e_bounds) {
            var d_x = typeof x === 'function' ? x.call(this, d, i) : x,
                d_y = typeof y === 'function' ? y.call(this, d, i) : y,
                d_anchor = typeof anchor === 'function' ? anchor.call(this, d, i) : anchor;
            
            return [1,0,0,1,
                    d_x + ANCHOR_OFFSET[d_anchor][0] * e_bounds.width,
                    d_y + ANCHOR_OFFSET[d_anchor][1] * e_bounds.height];
        });
    };
    
    d3.selection.prototype.setGlobalBBox = function (x, y, width, height) {
        var self = this;
        return self.setGlobalTransform(function (d, i, e_bounds) {
            var d_x = typeof x === 'function' ? x.call(this, d, i) : x,
                d_y = typeof y === 'function' ? y.call(this, d, i) : y,
                d_width = typeof width === 'function' ? width.call(this, d, i) : width,
                d_height = typeof height === 'function' ? height.call(this, d, i) : height,
                scale_x = d_width / e_bounds.width,
                scale_y = d_height / e_bounds.height;
            
            return [scale_x, 0, 0, scale_y, d_x + d_width/2, d_y + d_height/2];
        });
    };
    
    /**
     * Applies a transformation matrix to every element in the selection AFTER first centering
     * the element on the document's 0,0 coordinate.
     *
     * @method setGlobalTransform
     * @param {Array} m A 6-element matrix in SVG order, e.g.
     * a matrix that translates 5px in x and 10px in y would be [1,0,0,1,5,10]. May also be
     * a function that returns an Array; TODO: better explanation of parameters
     */
    d3.selection.prototype.setGlobalTransform = function (m) {
        var self = this;
        return self.each(function (d, i) {
            var e = this,
                e_bounds = e.getBoundingClientRect(),
                toGlobalZeroM = [1,0,0,1,-(e_bounds.left + e_bounds.width/2),-(e_bounds.top + e_bounds.width/2)],
                currentM = e.getAttribute('transform'),
                d_m = typeof m === 'function' ? m.call(this, d, i, e_bounds) : m,
                stringMode,
                params;
            
            if (currentM && currentM !== "null") {
                currentM = currentM.split('(');
                stringMode = currentM[0].trim().toLowerCase();
                params = currentM[1].substring(0, currentM[1].length - 1).split(',');
                            
                if (stringMode === 'translate') {
                    currentM = [1,0,0,1,Number(params[0]),Number(params[1])];
                } else if (stringMode === 'matrix') {
                    currentM = params;
                } else if (stringMode === 'rotate') {
                    currentM = [Math.cos(params[0]),
                                Math.sin(params[0]),
                                -Math.sin(params[0]),
                                Math.cos(params[0]),
                                0,
                                0];
                } else {
                    throw stringMode + ' transforms are not yet supported.';
                }
            } else {
                currentM = [1,0,0,1,0,0];
            }
            // Given its current transform matrix, translate the object so it's centered at 0,0
            currentM = matMultiply(toGlobalZeroM, currentM);
            // Now apply d_m
            currentM = matMultiply(d_m, currentM);
            
            e.setAttribute('transform', 'matrix(' + currentM.join(',') + ')');
        });
    };
})();