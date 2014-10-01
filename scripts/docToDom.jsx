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
    spaceSwapper = new RegExp(' ', 'g');

function standardize(activeDoc) {
    var nameLookup = {},
        docTags;
    
    try {
        docTags = JSON.parse(activeDoc.tags.getByName('id3_data').value);
    } catch (e) {
        docTags = {
            document : null,
            artboards : {},
            layers : {}
        };
    }
    
    function standardizeItems(items, tagType) {
        var i,
            oldName,
            name,
            newName,
            freeId = 1,
            tag;
        
        for (i = 0; i < items.length; i += 1) {
            // Make sure item names have no spaces (DOM restriction) and are unique
            oldName = items[i].name;
            name = oldName.replace(spaceSwapper, '_');
            
            newName = name;
            while (reservedNames.hasOwnProperty(newName) || nameLookup.hasOwnProperty(newName)) {
                newName = name + freeId;
                freeId += 1;
            }
            items[i].name = newName;
            nameLookup[newName] = items[i];
            
            // Create the id3_data tag if it doesn't exist
            if (tagType === 'native') {
                try {
                    items[i].tags.getByName('id3_data');
                } catch (e) {
                    tag = items[i].tags.add();
                    tag.name = 'id3_data';
                    tag.value = 'null';
                }
            } else {
                if (oldName !== newName && docTags[tagType].hasOwnProperty(oldName)) {
                    docTags[tagType][newName] = docTags[tagType][oldName];
                    delete docTags[tagType][oldName];
                } else if (docTags[tagType].hasOwnProperty(newName) === false) {
                    docTags[tagType][newName] = null;
                }
            }
        }
    }
    
    // Illustrator doesn't have tags on layers or artboards,
    // so I cheat and embed both inside the document's tag
    standardizeItems(activeDoc.artboards, 'artboards');
    standardizeItems(activeDoc.layers, 'layers');
    try {
        tag = activeDoc.tags.getByName('id3_data');
        tag.value = JSON.stringify(docTags);
    } catch (e) {
        tag = activeDoc.tags.add();
        tag.name = 'id3_data';
        tag.value = JSON.stringify(docTags);
    }
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
    var output = {
        name : p.name,
        zIndex : p.zOrderPosition,
        fill : extractColor(p, 'fillColor'),
        stroke : extractColor(p, 'strokeColor'),
        strokeWidth : p.strokeWidth,
        opacity : p.opacity / 100,
        closed : p.closed,
        points : [],
        data : JSON.parse(p.tags.getByName('id3_data').value)
    },
        pt,
        controlPoint;
    
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

function extractGroup(g) {
    var output = {
        name : g.name,
        zIndex : g.zOrderPosition,
        groups : [],
        paths : [],
        data : JSON.parse(g.tags.getByName('id3_data').value)
    },
        s,
        p;
    
    for (s = 0; s < g.groupItems.length; s += 1) {
        output.groups.push(extractGroup(g.groupItems[s]));
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
            g,
            s,
            p,
            docTags;
        
        standardize(activeDoc);
        
        docTags = JSON.parse(activeDoc.tags.getByName('id3_data').value);
        
        output = {
            name : activeDoc.name,
            width : activeDoc.width,
            height : activeDoc.height,
            artboards : [],
            groups : [],
            data : docTags.document
        };
        
        for (a = 0; a < activeDoc.artboards.length; a += 1) {
            output.artboards.push({
                name: activeDoc.artboards[a].name,
                rect: activeDoc.artboards[a].artboardRect,
                data: docTags.artboards[activeDoc.artboards[a].name]
            });
            // Illustrator has inverted Y coordinates
            output.artboards[a].rect[1] = -output.artboards[a].rect[1];
            output.artboards[a].rect[3] = -output.artboards[a].rect[3];
        }
        for (l = 0; l < activeDoc.layers.length; l += 1) {
            g = activeDoc.layers[l];
            
            output.groups.push({
                name : g.name,
                zIndex : g.zOrderPosition,
                groups : [],
                paths : [],
                data : docTags.layers[g.name]
            });
            
            for (s = 0; s < g.groupItems.length; s += 1) {
                output.groups.push(extractGroup(g.groupItems[s]));
            }
            for (p = 0; p < g.pathItems.length; p += 1) {
                output.paths.push(extractPath(g.pathItems[p]));
            }
        }
    }
    
    return output;
}


JSON.stringify(extractDocument());