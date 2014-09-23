function constructLookup(activeDoc) {
    var i,
        name,
        reservedNames = {   // All IDs in the panel are reserved, and we include the empty
            "" : true,      // string so that elements with no name will be given one
            "dom" : true,
            "controls" : true,
            "domToDoc" : true,
            "debugButton" : true
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
    return "";
}


function describeElement(e) {
    if (e.typename === 'PathItem') {
        return {
            typename : 'path',
            d : extractPath(e)
        }
    } else if (e.typename === 'GroupItem') {
        return {
            typename : 'g'
        };
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
            pathItems : {}
        };
        
        var docElements = constructLookup(activeDoc),
            name;
        
        for (name in docElements) {
            if (docElements.hasOwnProperty(name)) {
                output.pathItems[name] = describeElement(docElements[name]);
            }
        }
    }
    
    return output;
}


JSON.stringify(collectOutput());