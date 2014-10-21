var alertedCMYK = false,
    alertedUnsupported = false,
    reservedNames = {   // All IDs in the panel are reserved, and we include the empty
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
    },
    alphabetic = new RegExp('[A-Za-z]', 'g'),
    invalid = new RegExp('[^A-Za-z0-9-_]','g'),
    tagList = [
        "id3_data",
        "id3_classNames",
        "id3_reverseTransform"
    ],
    memo = "";

function standardize(activeDoc) {
    var nameLookup = {};
    
    function standardizeItems(items, tagType) {
        var i,
            oldName,
            name,
            newName,
            freeId = 1,
            tag,
            t;
        
        for (i = 0; i < items.length; i += 1) {
            // Make sure item names begin with [A-Za-z] and contain only [A-Za-z0-9\-\_]
            // (jQuery / old DOM restrictions), and are unique (case-insensitive)
            oldName = items[i].name;
            name = oldName.replace(invalid, '_');
            if (name.length === 0 || alphabetic.test(name[0]) !== true) {
                name = 'entity_' + name;
            }
            
            newName = name;
            while (reservedNames.hasOwnProperty(newName) || nameLookup.hasOwnProperty(newName)) {
                newName = name + freeId;
                freeId += 1;
            }
            items[i].name = newName;
            nameLookup[newName] = items[i];
            
            // Create the needed tags if they don't exist
            if (tagType === 'native') {
                for (t = 0; t < tagList.length; t += 1) {
                    try {
                        items[i].tags.getByName(tagList[t]);
                    } catch (e) {
                        tag = items[i].tags.add();
                        tag.name = tagList[t];
                        tag.value = 'null';
                    }
                }
            }
        }
    }
    
    standardizeItems(activeDoc.artboards, 'artboards');
    standardizeItems(activeDoc.layers, 'layers');
    
    standardizeItems(activeDoc.pathItems, 'native');
    standardizeItems(activeDoc.groupItems, 'native');
    
    return nameLookup;
}

function extractColor(e, attr) {
    // TODO: If the activeDocument is in CMYK mode, add
    // device-cmyk(c,m,y,k) to the SVG element's style
    // with an rgb backup. For now, I stupidly convert
    // everything to RGB
    if (e[attr].typename === 'RGBColor') {
        return 'rgb(' + e[attr].red + ',' +
                        e[attr].green + ',' +
                        e[attr].blue + ')';
    } else if (e[attr].typename === 'GrayColor') {
        return 'rgb(' + e[attr].gray + ',' +
                        e[attr].gray + ',' +
                        e[attr].gray + ')';
    } else if (e[attr].typename === 'CMYKColor') {
        // TODO: provide an rgb backup in the string
        if (alertedCMYK === false) {
            alert('iD3 does not yet support CMYK Color Mode.');
            alertedCMYK = true;
        }
        
        return 'device-cmyk(' + e[attr].cyan + ',' +
                                e[attr].magenta + ',' +
                                e[attr].yellow + ',' +
                                e[attr].black + ')';
    } else if (e[attr].typename === 'NoColor') {
        return 'none';
    }else {
        if (alertedUnsupported === false) {
            alert('iD3 does not yet support ' + e[attr].typename);
            alertedUnsupported = true;
        }
        return 'rgb(0,0,0)';
    }
}

function extractPath (p) {
    memo = p.name;
    var output = {
        itemType : 'path',
        name : p.name,
        fill : extractColor(p, 'fillColor'),
        stroke : extractColor(p, 'strokeColor'),
        strokeWidth : p.strokeWidth,
        opacity : p.opacity / 100,
        closed : p.closed,
        points : [],
        data : JSON.parse(p.tags.getByName('id3_data').value),
        classNames : p.tags.getByName('id3_classNames').value,
        reverseTransform : p.tags.getByName('id3_reverseTransform').value
    },
        pt,
        controlPoint;
    
    try {
        output.zIndex = p.zOrderPosition;
    } catch(e) {
        // TODO: there's a bug in Illustrator that causes an Internal error
        // if you attempt to get the zOrderPosition of an object inside a group
        output.zIndex = 100;
    }
    
    if (p.filled === false) {
        output.fill = 'none';
    }
    if (p.stroked === false) {
        output.stroke = 'none';
    }
    
    for (pt = 0; pt < p.pathPoints.length; pt += 1) {
        output.points.push({
            anchor : p.pathPoints[pt].anchor,
            leftDirection : p.pathPoints[pt].leftDirection,
            rightDirection : p.pathPoints[pt].rightDirection
        });
        for (controlPoint in output.points[pt]) {
            if (output.points[pt].hasOwnProperty(controlPoint)) {
                // Illustrator has inverted Y coordinates
                output.points[pt][controlPoint][1] = -output.points[pt][controlPoint][1];
            }
        }
    }
    
    return output;
}

function extractGroup(g, iType) {
    var output = {
        itemType : iType,
        name : g.name,
        groups : [],
        paths : []
    },
        s,
        p;
    
    try {
        output.zIndex = g.zOrderPosition;
    } catch(e) {
        // TODO: there's a bug in Illustrator that causes an Internal error
        // if you attempt to get the zOrderPosition of an object inside a group
        output.zIndex = 100;
    }
    
    if (iType === 'group') {
        output.data = JSON.parse(g.tags.getByName('id3_data').value);
        output.classNames = g.tags.getByName('id3_classNames').value;
        output.reverseTransform = g.tags.getByName('id3_reverseTransform').value;
    }
    
    for (s = 0; s < g.groupItems.length; s += 1) {
        output.groups.push(extractGroup(g.groupItems[s], 'group'));
    }
    for (p = 0; p < g.pathItems.length; p += 1) {
        output.paths.push(extractPath(g.pathItems[p]));
    }
    return output;
}

function extractDocument() {
    var output = null;

    if (app.documents.length > 0) {
        var activeDoc = app.activeDocument,
            a,
            l,
            s;
        
        standardize(activeDoc);
        
        output = {
            itemType : 'document',
            name : activeDoc.name.split('.')[0],
            width : activeDoc.width,
            height : activeDoc.height,
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
            output.layers.push(extractGroup(activeDoc.layers[l], 'layer'));
        }
        for (s = 0; s < activeDoc.selection.length; s += 1) {
            output.selection.push(activeDoc.selection[s].name);
        }
    }
    
    return output;
}

try {
    JSON.stringify(extractDocument());
} catch(e) {
    'Error: ' + e.message + '\nLine ' + e.line + ': ' + e.source.split('\n')[e.line-1] + '\n\nmemo:' + memo;
}