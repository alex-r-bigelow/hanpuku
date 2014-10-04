var reservedNames = {   // All IDs in the panel are reserved, and we include the empty
        "" : true,      // string so that elements with no name will be given one
        "userCSS" : true,
        "dom" : true,
        "code" : true,
        "cssEditor" : true,
        "codeControls" : true,
        "sampleMenu" : true,
        "dataEditor" : true,
        "dataTypeSelect" : true,
        "jsEditor" : true,
        "docControls" : true,
        "zoomButtons" : true,
        "debugButton" : true
    };

function standardize() {
    var nameLookup = {};
    function standardizeElement(e, m) {
        var transform,
            stringMode,
            params,
            i,
            d,
            replaceNodeAttrs = null,
            newNode,
            a,
            data,
            id,
            newId,
            copyNumber = 1;
        
        // Ensure a unique ID
        id = e.getAttribute('id');
        if (id === null) {
            id = 'entity';
        }
        newId = id;
        
        while (reservedNames.hasOwnProperty(newId) || nameLookup.hasOwnProperty(newId)) {
            newId = id + copyNumber;
            copyNumber += 1;
        }
        e.setAttribute('id', newId);
        nameLookup[newId] = e;
        
        // Apply all transformations
        if (m === undefined) {
            m = [1,0,0,1,0,0];
        }
        transform = e.getAttribute('transform');
        
        if (transform !== null) {
            transform = transform.split('(');
            stringMode = transform[0].trim().toLowerCase();
            params = transform[1].substring(0, transform[1].length - 1).split(',');
                        
            if (stringMode === 'translate') {
                m = matMultiply(m, [1,0,0,1,Number(params[0]),Number(params[1])]);
            } else if (stringMode === 'matrix') {
                m = matMultiply(m, params);
            } else if (stringMode === 'rotate') {
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
        }
        
        // Convert all elements to cubic-interpolated path, or recurse if a group
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
            e.setAttribute('d', pathToCubicPath(e.getAttribute('d'), m));
        } else if (e.tagName === 'g' || e.tagName === 'svg') {
            for (i = 0; i < e.childNodes.length; i += 1) {
                standardizeElement(e.childNodes[i], m);
            }
        } else if (e.tagName === 'text') {
            // I'll need to hack the transformation matrices
            // for text when I actually convert
            e.setAttribute('transform','matrix(' + m.join(',') + ')');
        } else {
            throw 'standardize doesn\'t yet support tag ' + e.tagName;
        }
        
        // Convert the existing element, with all its attributes and d3-assigned
        // data, to a path element. Don't copy attributes that are being replaced
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
            newNode.setAttribute('d', d);
            data = d3.select('#' + newId).data();
            e.parentNode.replaceChild(newNode,e);
            d3.select('#' + newId).data(data);
            nameLookup[newId] = e;
        }
    }
    
    standardizeElement(jQuery('#dom svg')[0]);
}

function extractDocument () {
    standardize();
    
    var output = {
        artboards : [],
        layers : [],
        selection : []
    };
    
    for (a = 0; a < activeDoc.artboards.length; a += 1) {
        output.artboards.push({
            name: activeDoc.artboards[a].name,
            rect: activeDoc.artboards[a].artboardRect
        });
        // Illustrator has inverted Y coordinates
        output.artboards[a].rect[1] = -output.artboards[a].rect[1];
        output.artboards[a].rect[3] = -output.artboards[a].rect[3];
    }
    for (l = 0; l < activeDoc.layers.length; l += 1) {
        output.layers.push(extractLayer(activeDoc.layers[l]));
    }
    for (s = 0; s < activeDoc.selection.length; s += 1) {
        output.selection.push(activeDoc.selection[s].name);
    }
    
    return output;
}

function domToDoc () {
    standardize();
    /*runJSX(JSON.stringify(extractDocument()), 'scripts/domToDoc.jsx', function (result) {
        
    });*/
}