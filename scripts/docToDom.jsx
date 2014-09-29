var alertedCMYK = false,
    alertedUnsupported = false;

function phrogz(name){ 
  var v,params=Array.prototype.slice.call(arguments,1);
  return function(o){
    return (typeof (v=o[name])==='function' ? v.apply(o,params) : v );
  };
}

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
    
    for (i = 0; i < activeDoc.artboards.length; i += 1) {
        name = activeDoc.artboards[i].name;
        if (reservedNames.hasOwnProperty(name) || nameLookup.hasOwnProperty(name)) {
            nameless.push(activeDoc.artboards[i]);
        } else {
            nameLookup[name] = activeDoc.artboards[i];
        }
    }
    for (i = 0; i < activeDoc.layers.length; i += 1) {
        name = activeDoc.layers[i].name;
        if (reservedNames.hasOwnProperty(name) || nameLookup.hasOwnProperty(name)) {
            nameless.push(activeDoc.layers[i]);
        } else {
            nameLookup[name] = activeDoc.layers[i];
        }
    }
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
        points : []
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
        paths : []
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
            idLookup = constructLookup(activeDoc),
            a,
            l;
        
        output = {
            name : activeDoc.name,
            width : activeDoc.width,
            height : activeDoc.height,
            artboards : [],
            groups : []
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
            output.groups.push(extractGroup(activeDoc.layers[l]));
        }
    }
    
    return output;
}


JSON.stringify(extractDocument());