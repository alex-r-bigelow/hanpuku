(function () {
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
    
    function storeTag(item, name, value) {
        i = item.tags.add();
        i.name = name;
        i.value = String(value);
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
        if (iC === undefined) {
            console.log(dC);
        }
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
    
    function applyFillAndStroke(iItem, dItem) {
        if (dItem.fill === 'none') {
            iItem.filled = false;
        } else {
            if (iItem.fillColor === undefined) {
                iItem.fillColor = new RGBColor();
            }
            applyColor(iItem.fillColor, dItem.fill);
        }
        
        
        
        if (dItem.stroke === 'none') {
            if (dItem.itemType === 'text') {
                iItem.strokeWeight = 0;
            } else {
                iItem.strokeWidth = 0;
            }
            
            iItem.stroked = false;
        } else {
            if (dItem.itemType === 'text') {
                iItem.strokeWeight = dItem.strokeWidth;
            } else {
                iItem.strokeWidth = dItem.strokeWidth;
            }
            
            if (iItem.strokeColor === undefined) {
                iItem.strokeColor = new RGBColor();
            }
            applyColor(iItem.strokeColor, dItem.stroke);
        }
        
        iItem.opacity = dItem.opacity*100;
    }
    
    function applyBasics(iItem, dItem) {
        storeTag(iItem, 'hanpuku_data', JSON.stringify(dItem.data));
        storeTag(iItem, 'hanpuku_classNames', dItem.classNames);
        storeTag(iItem, 'hanpuku_reverseTransform', dItem.reverseTransform);
        
        if (doc.selection.indexOf(dItem.name) !== -1) {
            iItem.selected = true;
        }
    }
    
    function setPathPoints(iPath, segment) {
        var anchorList = [];
        
        for (i = 0; i < segment.points.length; i += 1) {
            anchorList.push(segment.points[i].anchor);
        }
        
        iPath.setEntirePath(anchorList);
        for (i = 0; i < segment.points.length; i += 1) {
            iPath.pathPoints[i].leftDirection = segment.points[i].leftDirection;
            iPath.pathPoints[i].rightDirection = segment.points[i].rightDirection;
        }
        iPath.closed = segment.closed;
    }
    
    function applyPath(iPath, dPath) {
        iPath.name = dPath.name;
        
        setPathPoints(iPath, dPath.segments[0]);
        
        applyFillAndStroke(iPath, dPath);
        applyBasics(iPath, dPath);
    }
    
    function applyCompoundPath(iCompPath, dCompPath) {
        var i,
            segment;
        
        iCompPath.name = dCompPath.name;
        if (iCompPath.pathItems !== undefined) {
            // Because compound paths use the same settings across all
            // child elements, I can simply start fresh - nothing should
            // get nuked by doing this
            iCompPath.pathItems.removeAll();
        }
        for (i = 0; i < dCompPath.segments.length; i += 1) {
            segment = iCompPath.pathItems.add();
            setPathPoints(segment, dCompPath.segments[i]);
        }
        
        // The compound path doesn't possess any visual styles of its own;
        // instead, Illustrator propagates style changes to one pathItem to all
        // of them
        applyFillAndStroke(iCompPath.pathItems[0], dCompPath);
        applyBasics(iCompPath, dCompPath);
    }
    
    function applyText(iText, dText) {
        var i,
            j,
            currentShift,
            scale_x,
            scale_y,
            theta,
            x,
            y;
        
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
        
        // Apply per-character kerning, tracking, baseline shift, and rotation
        dText.kerning = dText.kerning.split(/,|\s+/);
        dText.baselineShift = dText.baselineShift.split(/,|\s+/);
        dText.rotate = dText.rotate.split(/,|\s+/);
        currentShift = 0;
        
        for (i = 0; i < iText.characters.length; i += 1) {
            if (dText.kerning.length > i) {
                iText.characters[i].kerning = 1000*parseFloat(dText.kerning[i]);    // We need thousandths of an em
            }
            if (dText.baselineShift.length > i) {
                currentShift -= parseFloat(dText.baselineShift[i]); // Already in pt
            }
            iText.characters[i].characterAttributes.baselineShift = currentShift;
            if (dText.rotate.length > i) {
                iText.characters[i].characterAttributes.rotation = parseFloat(dText.rotate[i]);  // Already in degrees
            }
        }
        
        // In addition to data, we have to freeze internal x and y coordinates
        // so that the SVG DOM doesn't lose them (we don't use them in Illustrator,
        // but we have to pass them along)
        storeTag(iText, 'hanpuku_internalX', dText.internalX);
        storeTag(iText, 'hanpuku_internalY', dText.internalY);
        
        // Transformations (this took FOREVER to figure out!! be exceedingly cautious if touching!)
        iText.resize(dText.scaleX*100, dText.scaleY*100, true, true, true, true, true, Transformation.DOCUMENTORIGIN);
        iText.rotate(dText.theta*180/Math.PI, true, true, true, true, Transformation.DOCUMENTORIGIN);
        iText.translate(dText.x, dText.y);
        
        // Extract scale, rotation, and translation from Illustrator's
        // matrix property (in theory I should be able to use the ones
        // in dText, but Illustrator does strange stuff to its matrices
        // that I haven't figured out yet). We need to know this to record
        // any transformations that are made in Illustrator:
        temp = iText.parent.textFrames.add();
        
        scale_x = Math.sqrt(iText.matrix.mValueA*iText.matrix.mValueA +
                            iText.matrix.mValueC*iText.matrix.mValueC);
        scale_y = Math.sqrt(iText.matrix.mValueB*iText.matrix.mValueB +
                            iText.matrix.mValueD*iText.matrix.mValueD);
        theta = Math.atan2(iText.matrix.mValueB, iText.matrix.mValueD);
        
        temp.resize(scale_x*100, scale_y*100, true, true, true, true, true, Transformation.DOCUMENTORIGIN);
        temp.rotate(theta*180/Math.PI, true, true, true, true, Transformation.DOCUMENTORIGIN);
        
        x = iText.matrix.mValueTX - temp.matrix.mValueTX;
        y = iText.matrix.mValueTY - temp.matrix.mValueTY;
        
        temp.remove();

        storeTag(iText, 'hanpuku_scale_x_0', scale_x);
        storeTag(iText, 'hanpuku_scale_y_0', scale_y);
        storeTag(iText, 'hanpuku_theta_0', theta);
        storeTag(iText, 'hanpuku_x_0', x);
        storeTag(iText, 'hanpuku_y_0', y);
        
        // Generic attributes
        applyFillAndStroke(iText.textRange, dText);
        applyBasics(iText, dText);
    }
    
    function applyGroup(iGroup, dGroup)
    {
        //var itemOrder = dGroup.groups.concat(dGroup.paths, dGroup.text).sort(phrogz('zIndex')),
        var itemOrder = dGroup.groups.concat(dGroup.paths).concat(dGroup.text).sort(phrogz('zIndex')),
            i,
            newItem;
        
        iGroup.name = dGroup.name;
        
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
                if (itemOrder[i].segments.length > 1) {
                    // This is a compound path
                    try {
                        newItem = iGroup.compoundPathItems.getByName(itemOrder[i].name);
                    } catch (e) {
                        try {
                            // If this used to be a regular path, delete the old one
                            newItem = iGroup.pathItems.getByName(itemOrder[i].name);
                            newItem.remove();
                        } catch (e) {}
                        newItem = iGroup.compoundPathItems.add();
                    }
                    applyCompoundPath(newItem, itemOrder[i]);
                } else {
                    // This is a regular path
                    try {
                        newItem = iGroup.pathItems.getByName(itemOrder[i].name);
                    } catch (e) {
                        try {
                            // If this used to be a compound path, delete the old one
                            newItem = iGroup.compoundPathItems.getByName(itemOrder[i].name);
                            newItem.remove();
                        } catch (e) {}
                        newItem = iGroup.pathItems.add();
                    }
                    applyPath(newItem, itemOrder[i]);
                }
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
        
        // Generic attributes (Layers don't support tags :-( TODO: hack them into activeDoc.XMPString?))
        if (dGroup.itemType === 'group') {
            applyBasics(iGroup, dGroup);
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
            } catch (e) {}
        }
    }
    
    try {
        applyDocument();
        app.redraw();
    } catch(e) {
        console.logError(e);
    }
    return console.jsonPacket();
})();