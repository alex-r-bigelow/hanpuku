var doc = JSON.parse(input),
    activeDoc;

function ConsoleProxy () {
    var self = this;
    self.logs = [];
    self.error = null;
    self.output = null;
}
ConsoleProxy.prototype.log = function (message) {
    var self = this;
    self.logs.push(String(message));
};
ConsoleProxy.prototype.logError = function (e) {
    var self = this;
    self.error = {
        'message' : String(e.message),
        'line' : String(e.line)
    };
};
ConsoleProxy.prototype.setOutput = function (o) {
    var self = this;
    self.output = o;
};
ConsoleProxy.prototype.jsonPacket = function () {
    var self = this;
    return JSON.stringify({
        'logs' : self.logs,
        'error' : self.error,
        'output' : self.output
    });
};

var console = new ConsoleProxy();

// Shim - ExtendScript doesn't have indexOf
if (typeof Array.prototype.indexOf != "function") {  
    Array.prototype.indexOf = function (el) {  
        for(var i = 0; i < this.length; i++) if(el === this[i]) return i;  
        return -1;  
    };
}  

function phrogz(name)
{
    var v, params = Array.prototype.slice.call(arguments, 1);
    return function (o)
    {
        return (typeof (v = o[name]) === 'function' ? v.apply(o, params) : v);
    };
}

function applyColor(iC,dC) {
    if (dC.split('(').length < 2) {
        alert(dC);
    }
    dC = dC.split('(')[1];
    dC = dC.split(')')[0];
    dC = dC.split(',');
    
    iC.red = Number(dC[0]);
    iC.green = Number(dC[1]);
    iC.blue = Number(dC[2]);
}

function applyPath(iPath, dPath) {
    iPath.name = dPath.name;
    
    if (dPath.fill === 'none') {
        iPath.filled = false;
    } else {
        applyColor(iPath.fillColor, dPath.fill);
    }
    if (dPath.stroke === 'none') {
        iPath.stroked = false;
    } else {
        applyColor(iPath.strokeColor, dPath.stroke);
    }
    iPath.strokeWidth = dPath.strokeWidth;
    iPath.opacity = dPath.opacity*100;

    var anchorList = [],
        i = iPath.tags.add();
    i.name = 'id3_data';
    i.value = JSON.stringify(dPath.data);
    
    i = iPath.tags.add();
    i.name = 'id3_classNames';
    i.value = dPath.classNames;
    
    i = iPath.tags.add();
    i.name = 'id3_reverseTransform';
    i.value = dPath.reverseTransform;
    
    for (i = 0; i < dPath.points.length; i += 1) {
        anchorList.push(dPath.points[i].anchor);
    }
    iPath.setEntirePath(anchorList);
    for (i = 0; i < dPath.points.length; i += 1) {
        iPath.pathPoints[i].leftDirection = dPath.points[i].leftDirection;
        iPath.pathPoints[i].rightDirection = dPath.points[i].rightDirection;
    }
    iPath.closed = dPath.closed;
    
    if (doc.selection.indexOf(dPath.name) !== -1) {
        iPath.selected = true;
    }
}

function applyGroup(iGroup, dGroup)
{
    var existingGroupNames = [],
        existingPathNames = [],
        itemOrder = dGroup.groups.concat(dGroup.paths).sort(phrogz('zIndex')),
        i,
        newItem;
    
    // Update the parent's tags (Layers don't support tags :-( TODO: hack them into activeDoc.XMPString?))
    iGroup.name = dGroup.name;
    if (dGroup.itemType === 'group') {
        i = iGroup.tags.add();
        i.name = 'id3_data';
        i.value = JSON.stringify(dGroup.data);
        
        i = iGroup.tags.add();
        i.name = 'id3_classNames';
        i.value = dGroup.classNames;
        
        i = iGroup.tags.add();
        i.name = 'id3_reverseTransform';
        i.value = dGroup.reverseTransform;
    }
    
    // Get the lists of existing names in case we need to remove any
    for (i = 0; i < iGroup.groupItems.length; i += 1) {
        existingGroupNames.push(iGroup.groupItems[i].name);
    }
    for (i = 0; i < iGroup.pathItems.length; i += 1) {
        existingPathNames.push(iGroup.pathItems[i].name);
    }
    // Modify / add needed groups and paths in order
    for (i = 0; i < itemOrder.length; i += 1) {
        if (itemOrder[i].itemType === 'group') {
            try {
                newItem = iGroup.groupItems.getByName(itemOrder[i].name);
                existingGroupNames.splice(existingGroupNames.indexOf(newItem.name), 1);
            } catch (e) {
                newItem = iGroup.groupItems.add();
            }
            applyGroup(newItem, itemOrder[i]);
        } else if (itemOrder[i].itemType === 'path') {
            try {
                newItem = iGroup.pathItems.getByName(itemOrder[i].name);
                existingPathNames.splice(existingPathNames.indexOf(newItem.name), 1);
            } catch (e) {
                newItem = iGroup.pathItems.add();
            }
            applyPath(newItem, itemOrder[i]);
        } else if (itemOrder[i].itemType === 'text') {
            //TODO
        }
        newItem.zOrder(ZOrderMethod.BRINGTOFRONT);
    }
    // Remove any leftover groups or paths that were deleted in the DOM
    /*for (i = 0; i < existingGroupNames.length; i += 1) {
        iGroup.groupItems.getByName(existingGroupNames[i]).remove();
    }
    for (i = 0; i < existingPathNames.length; i += 1) {
        iGroup.pathItems.getByName(existingPathNames[i]).remove();
    }*/
    
    // Finally, check if the parent is selected
    if (doc.selection.indexOf(dGroup.name) !== -1) {
        iGroup.selected = true;
    }
}

function applyDocument()
{
    if (app.documents.length === 0)
    {
        app.documents.add();
    }
    activeDoc = app.activeDocument;
    var existingNames, a, artboard, l, layer;
    
    // Get the list of current artboard names in case we need to remove any
    existingNames = [];
    for (a = 0; a < activeDoc.artboards.length; a += 1) {
        existingNames.push(activeDoc.artboards[a].name);
    }
    // Modify / add needed artboards
    for (a = 0; a < doc.artboards.length; a += 1)
    {
        try {
            artboard = activeDoc.artboards.getByName(doc.artboards[a].name);
            existingNames.splice(existingNames.indexOf(artboard.name), 1);
        } catch (e) {
            artboard = activeDoc.artboards.add(doc.artboards[a].rect);
        }
        artboard.artboardRect = doc.artboards[a].rect;
        artboard.name = doc.artboards[a].name;
    }
    // Remove any leftover artboards that were deleted in the DOM
    /*for (a = 0; a < existingNames.length; a += 1) {
        activeDoc.artboards.getByName(existingNames[a]).remove();
    }*/
    
    // Get the list of current layer names in case we need to remove any
    existingNames = [];
    for (l = 0; l < activeDoc.layers.length; l += 1) {
        existingNames.push(activeDoc.layers[l].name);
    }
    // Modify / add needed layers in order
    doc.layers = doc.layers.sort(phrogz('zIndex'));
    for (l = 0; l < doc.layers.length; l += 1)
    {
        try {
            layer = activeDoc.layers.getByName(doc.layers[l].name);
            existingNames.splice(existingNames.indexOf(layer.name), 1);
        } catch (e) {
            layer = activeDoc.layers.add();
        }
        layer.zOrder(ZOrderMethod.BRINGTOFRONT);
        applyGroup(layer, doc.layers[l]);
    }
    // Remove any leftover layers that were deleted in the DOM
    /*for (l = 0; l < existingNames.length; l += 1) {
        activeDoc.layers.getByName(existingNames[l]).remove();
    }*/
}

// (for now, I don't do remove anything, because the user could have added stuff
// without refreshing the extension... better to ignore deleting actions
// than to delete too much. I'll uncomment when Illustrator adds more
// event listeners)

try {
    applyDocument();
    app.redraw();
} catch(e) {
    console.logError(e);
}
console.jsonPacket();