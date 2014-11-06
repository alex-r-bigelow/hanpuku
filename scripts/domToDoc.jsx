var doc = JSON.parse(input),
    console = '"success"',
    activeDoc;

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
    
    if (doc.selection.indexOf(dPath.name) !== -1) {
        iPath.selected = true;
    }
}

function applyGroup(iGroup, dGroup)
{
    var itemOrder = dGroup.groups.concat(dGroup.paths).sort(phrogz('zIndex')),
        i,
        newItem;
    
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
    
    for (i = 0; i < itemOrder.length; i += 1) {
        if (itemOrder[i].itemType === 'group') {
            newItem = iGroup.groupItems.add();
            applyGroup(newItem, itemOrder[i]);
        } else if (itemOrder[i].itemType === 'path') {
            newItem = iGroup.pathItems.add();
            applyPath(newItem, itemOrder[i]);
        } else if (itemOrder[i].itemType === 'text') {
            //TODO
        }
        newItem.zOrder(ZOrderMethod.BRINGTOFRONT);
    }
    
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
    
    for (a = 0; a < doc.artboards.length; a += 1)
    {
        if (activeDoc.artboards.length === a)
        {
            artboard = activeDoc.artboards.add(doc.artboards[a].rect);
        } else {
            artboard = activeDoc.artboards[0];
        }
        artboard.artboardRect = doc.artboards[a].rect;
        artboard.name = doc.artboards[a].name;
    }

    // Nuke the document's current contents (everything will have been saved in doc)
    activeDoc.layers.removeAll();

    doc.layers = doc.layers.sort(phrogz('zIndex'));
    for (l = 0; l < doc.layers.length; l += 1)
    {
        if (activeDoc.layers.length === l) {
            layer = activeDoc.layers.add();
        } else {
            layer = activeDoc.layers[0];
        }
        layer.zOrder(ZOrderMethod.BRINGTOFRONT);
        applyGroup(layer, doc.layers[l]);
    }
}
applyDocument();
app.redraw();
console;