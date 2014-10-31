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

function standardizeColor(s) {
    if (s[0] === '#') {
        // Stolen from http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        s = s.replace(shorthandRegex, function(m, r, g, b) {
            s = r + r + g + g + b + b;
        });
        
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(s);
        s = 'rgb(' + parseInt(result[1], 16) + ', ' +
                     parseInt(result[2], 16) + ', ' +
                     parseInt(result[3], 16) + ')';
    }
    if (s !== 'none' && s.substring(0,4) !== 'rgb(') {
        throw "Unsupported color: " + s;
    }
    return s;
}

function standardizeElement(e, m) {
    return elementToCubicPaths(e, m, true);
}

var nameLookup,
    copyNumber = 1,
    count = 1;

function enforceUniqueIds(e) {
    var id,
        newId,
        children,
        i;
    
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
    
    if (e.tagName === 'g' || e.tagName === 'svg') {
        children = e.childNodes;
        for (i = 0; i < children.length; i += 1) {
            enforceUniqueIds(children[i]);
        }
    }
}

function standardize() {
    nameLookup = {};
    
    enforceUniqueIds(jQuery('#dom svg')[0]);
    standardizeElement(jQuery('#dom svg')[0]);
}

function extractPath(g, z) {
    var d = g.getAttribute('d');
    var coordList = d.split(pathSplitter).splice(1),
        output = {
            itemType : 'path',
            name : g.getAttribute('id'),
            zIndex : z,
            fill : standardizeColor(window.getComputedStyle(g).fill),
            stroke : standardizeColor(window.getComputedStyle(g).stroke),
            strokeWidth : parseFloat(window.getComputedStyle(g).strokeWidth),
            opacity : parseFloat(window.getComputedStyle(g).opacity),
            points : [],
            closed : d.substr(-1) === 'Z',
            data : d3.select('#' + g.getAttribute('id')).data()[0],
            classNames : g.getAttribute('class') === null ? "" : g.getAttribute('class'),
            reverseTransform : g.getAttribute('id3_reverseTransform') === null ? "" : g.getAttribute('id3_reverseTransform')
        },
        i,
        j;
    if (output.data === undefined) {
        output.data = null;
    }
    // Convert everything except the first entry
    // to a list of lists of point pairs
    // Also invert the y-coordinates
    if (output.closed === true) {
        coordList = coordList.splice(0,coordList.length-1); // throw away Z coordinate entries
    }
    // The first point only has one coordinate pair
    coordList[0] = coordList[0].split(',');
    coordList[0][0] = Number(coordList[0][0]);
    coordList[0][1] = -Number(coordList[0][1]);
    // The rest have three
    for (i = 1; i < coordList.length; i += 1) {
        coordList[i] = coordList[i].split(',');
        temp = [];
        for (j = 0; j < coordList[i].length; j += 2) {
            temp.push([Number(coordList[i][j]), -Number(coordList[i][j+1])]);
        }
        coordList[i] = temp;
    }
    
    // First point ##,##
    output.points.push({
        anchor : coordList[0],
        leftDirection : coordList[coordList.length-1][2],
        rightDirection : coordList[1][0]
    });
    // Middle points [[##,##],[##,##],[##,##]]
    for (i = 1; i < coordList.length - 1; i += 1) {
        output.points.push({
            anchor : coordList[i][2],
            leftDirection : coordList[i][1],
            rightDirection : coordList[i+1][0]
        });
    }
    // Last point
    output.points.push({
        anchor : coordList[coordList.length-1][2],
        leftDirection : coordList[coordList.length-1][1],
        rightDirection : coordList[0]
    });
    
    return output;
}

function extractGroup(g, z, iType) {
    var output = {
        itemType : iType,
        name : g.getAttribute('id'),
        zIndex : z,
        groups : [],
        paths : []
    },
        s,
        z2 = 1;
    
    if (iType === 'group') {
        output.data = d3.select('#' + g.getAttribute('id')).data()[0];
        if (output.data === undefined) {
            output.data = null;
        }
        output.classNames = g.getAttribute('class') === null ? "" : g.getAttribute('class');
        output.reverseTransform = g.getAttribute('id3_reverseTransform') === null ? "" : g.getAttribute('id3_reverseTransform');
    }
    for (s = 0; s < g.childNodes.length; s += 1) {
        if (g.childNodes[s].tagName === 'g') {
            output.groups.push(extractGroup(g.childNodes[s], z2, 'group'));
        } else if (g.childNodes[s].tagName === 'path') {
            output.paths.push(extractPath(g.childNodes[s], z2));
        } else if (g.childNodes[s].tagName === 'text') {
            // TODO
        } else {
            throw g.childNodes[s].tagName + " is not supported.";
        }
        z2 += 1;
    }
    return output;
}

function extractDocument () {
    standardize();
    
    var output = {
            itemType : 'document',
            artboards : [],
            layers : [],
            selection : selectedIDs
        },
        s,
        z = 1,
        temp;
    
    s = jQuery('#dom svg')[0].childNodes;
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
            output.layers.push(extractGroup(s[a], z, 'layer'));
            z += 1;
        }
    }
    
    return output;
}

function domToDoc () {
    // Throw away all the selection rectangles
    jQuery('path.selection').remove();
    
    runJSX(JSON.stringify(extractDocument()), 'scripts/domToDoc.jsx', function (result) {});
}