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
        console.warn("Bad color:" + String(dC));
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
        m,
        i,
        j,
        currentShift;
    
    iText.name = dText.name;
    iText.contents = dText.contents;
    
    // Fonts
    
    // TODO: This is non-trivial! Somehow need to find the closest named font...
    // app.textFonts.getByName('HelveticaNeue-UltraLightItalic'), or iterate
    // the array and check other properties (e.g.:
    // app.textFonts[301].family === 'Helvetica Neue'
    // app.textFonts[301].name === 'HelveticaNeue-UltraLightItalic'
    // app.textFonts[301].style === 'UltraLight Italic')
    
    // from the DOM, we get dText.fontFamily, dText.fontSize,
    // dText.fontStyle (normal, italic, oblique)
    // dText.fontVariant (normal, small-caps)
    // dText.fontWeight (normal, bold, bolder, lighter, 100-900)
    
    // Justification
    if (dText.justification === 'CENTER') {
        j = Justification.CENTER;
    } else if (dText.justification === 'RIGHT') {
        j = Justification.RIGHT;
    } else {
        j = Justification.LEFT;
    }
    iText.textRange.justification = j;
    
    // Colors
    if (dText.fill === 'none') {
        iText.filled = false;
    } else {
        applyColor(iText.textRange.characterAttributes.fillColor, dText.fill);
    }
    if (dText.stroke === 'none') {
        iText.stroked = false;
    } else {
        applyColor(iText.textRange.characterAttributes.strokeColor, dText.stroke);
    }
    
    // Apply per-character kerning, tracking, baseline shift, and rotation
    dText.kerning = dText.kerning.split(/,| /);
    dText.baselineShift = dText.baselineShift.split(/,| /);
    dText.rotate = dText.rotate.split(/,| /);
    currentShift = 0;
    for (i = 0; i < iText.characters.length; i += 1) {
        if (dText.kerning.length > i) {
            iText.characters[i].kerning = 1000*parseFloat(dText.kerning[i]);    // We need thousandths of an em
        }
        if (dText.baselineShift.length > i) {
            currentShift -= parseFloat(dText.baselineShift[i]); // Already in pt
            iText.characters[i].characterAttributes.baselineShift = currentShift;
        }
        if (dText.rotate.length > i) {
            iText.characters[i].characterAttributes.rotation = parseFloat(dText.rotate[i]);  // Already in degrees
        }
    }
    
    // Transformations (this took FOREVER to figure out!! be exceedingly cautions if touching!)
    iText.resize(dText.textTransforms.sx*100, dText.textTransforms.sy*100, true, true, true, true, true, Transformation.DOCUMENTORIGIN);
    iText.rotate(-dText.textTransforms.theta*180/Math.PI, true, true, true, true, Transformation.DOCUMENTORIGIN);
    iText.translate(dText.textTransforms.x, dText.textTransforms.y);
    
    // Data, classes, original SVG transform and anchor
    i = iText.tags.add();
    i.name = 'hanpuku_data';
    i.value = JSON.stringify(dText.data);
    
    i = iText.tags.add();
    i.name = 'hanpuku_classNames';
    i.value = dText.classNames;
    
    if (doc.selection.indexOf(dText.name) !== -1) {
        iText.selected = true;
    }
}

function applyGroup(iGroup, dGroup)
{
    //var itemOrder = dGroup.groups.concat(dGroup.paths, dGroup.text).sort(phrogz('zIndex')),
    var itemOrder = dGroup.groups.concat(dGroup.paths).concat(dGroup.text).sort(phrogz('zIndex')),
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
        } else if (itemOrder[i].itemType === 'text') {
            try {
                newItem = iGroup.textFrames.getByName(itemOrder[i].name);
            } catch (e) {
                newItem = iGroup.textFrames.add();
            }
            applyText(newItem, itemOrder[i]);
        }
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