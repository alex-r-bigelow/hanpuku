var doc = input,
    activeDoc,
    ITEM_CONTAINERS = {
        'group' : 'groupItems',
        'path' : 'pathItems',
        'text' : 'textFrames',
        'layer' : 'layers',
        'artboard' : 'artboards'
    };

function phrogz(name)
{
    var v, params = Array.prototype.slice.call(arguments, 1);
    return function (o)
    {
        return (typeof (v = o[name]) === 'function' ? v.apply(o, params) : v);
    };
}

function applyColor(iC,dC) {
    var red, green, blue, black;
    
    if (dC.split('(').length < 2) {
        alert(dC);
    }
    dC = dC.split('(')[1];
    dC = dC.split(')')[0];
    dC = dC.split(',');
    
    red = Number(dC[0]);
    green = Number(dC[1]);
    blue = Number(dC[2]);
    black = 1;
    
    if (activeDoc.documentColorSpace === DocumentColorSpace.RGB) {
        iC.red = red;
        iC.green = green;
        iC.blue = blue;
    } else {
        // TODO: support CMYK directly when Chrome supports it?
        red /= 255;
        green /= 255;
        blue /= 255;
        
        if (red > green && red > blue) {
            black = 1 - red;
        } else if (green > red && green > blue) {
            black = 1 - green;
        } else {
            black = 1 - blue;
        }
        
        iC.black = 100 * black;
        
        if (black === 1) {
            iC.cyan = 0;
            iC.magenta = 0;
            iC.yellow = 0;
        } else {
            iC.cyan = 100 * (1 - red - black) / (1 - black);
            iC.magenta = 100 * (1 - green - black) / (1 - black);
            iC.yellow = 100 * (1 - blue - black) / (1 - black);
        }
    }
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
    i.name = 'hanpuku_data';
    i.value = JSON.stringify(dPath.data);
    
    i = iPath.tags.add();
    i.name = 'hanpuku_classNames';
    i.value = dPath.classNames;
    
    i = iPath.tags.add();
    i.name = 'hanpuku_reverseTransform';
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

function applyText(iText, dText) {
    var transform,
        stringMode,
        params,
        m,
        i,
        j;
    
    iText.name = dText.name;
    
    iText.contents = dText.contents;
    
    // TODO: fix text rotation (if I wait to apply the transform until now
    // everything gets flipped... but if I do it before, then I can't rotate
    // the text at all...)
    
    // TODO: need to support leading (SVG dy), among other things
    
    /*if (dText.forwardTransform && dText.forwardTransform !== "null") {
        transform = dText.forwardTransform.split('(');
        params = transform[1].substring(0, transform[1].length - 1).split(',');
        
        // We'll always get a matrix transltion
        m = app.getIdentityMatrix();
        m.mValueA = Number(params[0]);
        m.mValueB = Number(params[1]);
        m.mValueC = Number(params[2]);
        m.mValueD = Number(params[3]);
        m.mValueTX = 0;
        m.mValueTY = 0;
        
        //iText.transform(m);
    }*/
    
    iText.left = Number(dText.anchor[0]) - (iText.anchor[0] - iText.left);
    iText.top = Number(dText.anchor[1]) - (iText.anchor[1] - iText.top);
    
    if (dText.justification === 'LEFT') {
        j = Justification.LEFT;
    } else if (dText.justification === 'CENTER') {
        j = Justification.CENTER;
    } else if (dText.justification === 'RIGHT') {
        j = Justification.RIGHT;
    } else {
        j = Justification.LEFT;
    }
    
    if (iText.contents.length > 0) {
        // For some reason, paragraphs gives length of 1 when there's an
        // empty string, but trying to interact with it causes errors...
        for (i = 0; i < iText.paragraphs.length; i += 1) {
            iText.paragraphs[i].justification = j;
        }
    }
    
    i = iText.tags.add();
    i.name = 'hanpuku_data';
    i.value = JSON.stringify(dText.data);
    
    i = iText.tags.add();
    i.name = 'hanpuku_classNames';
    i.value = dText.classNames;
    
    i = iText.tags.add();
    i.name = 'hanpuku_reverseTransform';
    i.value = dText.reverseTransform;
    
    if (doc.selection.indexOf(dText.name) !== -1) {
        iText.selected = true;
    }
}

function applyGroup(iGroup, dGroup)
{
    //var itemOrder = dGroup.groups.concat(dGroup.paths, dGroup.text).sort(phrogz('zIndex')),
    var itemOrder = dGroup.groups.concat(dGroup.paths).sort(phrogz('zIndex')),
        i,
        newItem;
    
    // Update the parent's tags (Layers don't support tags :-( TODO: hack them into activeDoc.XMPString?))
    iGroup.name = dGroup.name;
    if (dGroup.itemType === 'group') {
        i = iGroup.tags.add();
        i.name = 'hanpuku_data';
        i.value = JSON.stringify(dGroup.data);
        
        i = iGroup.tags.add();
        i.name = 'hanpuku_classNames';
        i.value = dGroup.classNames;
        
        i = iGroup.tags.add();
        i.name = 'hanpuku_reverseTransform';
        i.value = dGroup.reverseTransform;
    }
    
    // Modify / add needed groups, paths, and text items in order
    for (i = 0; i < itemOrder.length; i += 1) {
        if (itemOrder[i].itemType === 'group') {
            try {
                newItem = iGroup.groupItems.getByName(itemOrder[i].name);
            } catch (e) {
                newItem = iGroup.groupItems.add();
            }
            applyGroup(newItem, itemOrder[i]);
        } else if (itemOrder[i].itemType === 'path') {
            try {
                newItem = iGroup.pathItems.getByName(itemOrder[i].name);
            } catch (e) {
                newItem = iGroup.pathItems.add();
            }
            applyPath(newItem, itemOrder[i]);
        } /*else if (itemOrder[i].itemType === 'text') {
            try {
                newItem = iGroup.textFrames.getByName(itemOrder[i].name);
            } catch (e) {
                newItem = iGroup.textFrames.add();
            }
            applyText(newItem, itemOrder[i]);
        }*/
        newItem.zOrder(ZOrderMethod.BRINGTOFRONT);
    }
    
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
    var a, artboard, l, layer;
    
    // Modify / add needed artboards
    for (a = 0; a < doc.artboards.length; a += 1)
    {
        try {
            artboard = activeDoc.artboards.getByName(doc.artboards[a].name);
        } catch (e) {
            artboard = activeDoc.artboards.add(doc.artboards[a].rect);
        }
        artboard.artboardRect = doc.artboards[a].rect;
        artboard.name = doc.artboards[a].name;
    }
    
    // Modify / add needed layers in order
    doc.layers = doc.layers.sort(phrogz('zIndex'));
    for (l = 0; l < doc.layers.length; l += 1)
    {
        try {
            layer = activeDoc.layers.getByName(doc.layers[l].name);
        } catch (e) {
            layer = activeDoc.layers.add();
        }
        layer.zOrder(ZOrderMethod.BRINGTOFRONT);
        applyGroup(layer, doc.layers[l]);
    }
    
    // Remove any elements that were explicitly deleted in the DOM
    for (a = 0; a < doc.exit.length; a += 1) {
        try {
            activeDoc[ITEM_CONTAINERS[doc.exit[a].itemType]].getByName(doc.exit[a].name).remove();
        } catch (e) {
            // Do nothing
        }
    }
}

try {
    applyDocument();
    app.redraw();
} catch(e) {
    console.logError(e);
}
console.jsonPacket();