var alertedCMYK = false,
    alertedUnsupported = false;

function constructLookup(activeDoc) {
    var i,
        name,
        reservedNames = {   // All IDs in the panel are reserved, and we include the empty
            "" : true,      // string so that elements with no name will be given one
            "userCSS" : true,
            "dom" : true,
            "code" : true,
            "dataEditor" : true,
            "cssEditor" : true,
            "jsEditor" : true,
            "docControls" : true,
            "domControls" : true,
            "debugButton" : true,
            "sampleMenu" : true
        },
        nameLookup = {},
        freeId = 1,
        nameless = [];
    
    for (i = 0; i < activeDoc.pathItems.length; i += 1) {
        name = activeDoc.pathItems[i].name;
        if (reservedNames.hasOwnProperty(name) || nameLookup.hasOwnProperty(name)) {
            nameless.push(activeDoc.pathItems[i]);
        } else {
            nameLookup[name] = activeDoc.pathItems[i];
        }
    }
    for (i = 0; i < activeDoc.groupItems.length; i += 1) {
        name = activeDoc.groupItems[i].name;
        if (reservedNames.hasOwnProperty(name) || nameLookup.hasOwnProperty(name)) {
            nameless.push(activeDoc.groupItems[i]);
        } else {
            nameLookup[name] = activeDoc.groupItems[i];
        }
    }
    for (i = 0; i < nameless.length; i += 1) {
        name = "";
        while (reservedNames.hasOwnProperty(name) || nameLookup.hasOwnProperty(name)) {
            name = "entity" + freeId;
            freeId += 1;
        }
        nameless[i].name = name;
        nameLookup[name] = nameless[i];
    }
    return nameLookup;
}

function extractPath(e) {
    var p,
        point = e.pathPoints[0],
        nextPoint,
        d = "M" + point.anchor[0] + "," + (-point.anchor[1]);
    
    for (p = 0; p < e.pathPoints.length; p += 1) {
        point = e.pathPoints[p];
        if (p === e.pathPoints.length - 1) {
            if (e.closed !== true) {
                break;
            }
            nextPoint = e.pathPoints[0];
        } else {
            nextPoint = e.pathPoints[p + 1];
        }
        
        d += "C" + point.rightDirection[0] + "," + (-point.rightDirection[1]) + "," +
                   nextPoint.leftDirection[0] + "," + (-nextPoint.leftDirection[1]) + "," +
                   nextPoint.anchor[0] + "," + (-nextPoint.anchor[1]);
    }
    if (e.closed === true) {
        d += "Z";
    }
    return d;
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
    } else {
        if (alertedUnsupported === false) {
            alert('iD3 does not yet support ' + e[attr].typename);
            alertedUnsupported = true;
        }
        return 'rgb(0,0,0)';
    }
}

function describeElement(e) {
    if (e.typename === 'PathItem') {
        return {
            name : e.name,
            typename : 'path',
            d : extractPath(e),
            fill : extractColor(e, 'fillColor'),
            stroke : extractColor(e, 'strokeColor'),
            opacity : e.opacity / 100
        };
    } else if (e.typename === 'GroupItem') {
        return {
            name : e.name,
            typename : 'g'
        };
    } else {
        throw "Unsupported element type: " + e.typename;
    }
}

function collectOutput() {
    var output = null;

    if (app.documents.length > 0) {
        var activeDoc = app.activeDocument;
        
        output = {
            name : activeDoc.name,
            width : activeDoc.width,
            height : activeDoc.height,
            items : [] // TODO: I need to reassemble the hierarchy, not just add paths...
        };
        // A = activeDoc.artboards[0] (.artboardRect is a 4-element array)
        // L = activeDoc.layers[0] or L.layers[0]
        // G = L.groupItems[0] or G.groupItems[0]
        // P = L.pathItems[0] or G.pathItems[0]
        // pt = P.pathPoints[0]
        // sort each (except pt) by zOrderPosition (ascending)
        
        var docElements = constructLookup(activeDoc),
            name;
        
        for (name in docElements) {
            if (docElements.hasOwnProperty(name)) {
                output.items.push(describeElement(docElements[name]));
            }
        }
    }
    
    return output;
}


JSON.stringify(collectOutput());