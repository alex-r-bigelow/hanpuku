/*global input, app, console, DocumentColorSpace, RGBColor, Justification, Transformation, ZOrderMethod*/
(function () {
    "use strict";
    var doc = input,
        activeDoc,
        ITEM_CONTAINERS = {
            'group' : 'groupItems',
            'path' : 'pathItems',
            'text' : 'textFrames',
            'layer' : 'layers',
            'artboard' : 'artboards'
        },
        FONT_STRETCH = {
            Condensed : ['Condensed', 'Cond', 'Cn'],
            Regular : ['', 'Regular'],
            Extended : ['Extended']
        },
        FONT_WEIGHTS = {
            normal : [''],
            bold : ['Bold'],
            bolder : ['Black', 'ExtraBold', 'Heavy', 'ExtraBlack', 'Fat', 'Poster', 'UltraBlack'],
            lighter : ['Light', 'Thin', 'Book', 'Demi', 'ExtraLight', 'UltraLight'],
            '100' : ['ExtraLight', 'UltraLight'],
            '200' : ['Light', 'Thin'],
            '300' : ['Book', 'Demi'],
            '400' : [''],
            '500' : ['Medium'],
            '600' : ['Semibold', 'Demibold'],
            '700' : ['Bold'],
            '800' : ['Black', 'ExtraBold', 'Heavy'],
            '900' : ['ExtraBlack', 'Fat', 'Poster', 'UltraBlack']
        },
        FONT_STYLES = {
            'normal' : [''],
            'italic' : ['Italic', 'Oblique', 'It'],
            'oblique' : ['Oblique', 'Italic', 'It']
        },
        fontLookup = {},
        i;
    // As app.textFonts.getByName() needs both the font family and
    // the style name, and as that call takes a long time anyway, let's precompute
    // a font lookup table
    //for (i = 0; i < app.textFonts.length; i += 1) {
        //FONT_LOOKUP[]
    //}
    
    function COMPARE_Z(a, b) {
        return a.zIndex - b.zIndex;
    }
    
    function storeTag(item, name, value) {
        i = item.tags.add();
        i.name = name;
        i.value = String(value);
    }
    
    function applyFont(iTextRange, fontFamilies, fontStyle, fontWeight) {
        var i,
            f,
            base,
            stretch,
            foundFont = null,
            fontFamily,
            lookupString = fontFamilies.join(', ');
        if (fontStyle !== 'normal') {
            lookupString += ' +override ' + fontStyle;
        }
        if (fontWeight !== 'normal') {
            lookupString += ' +override ' + fontWeight;
        }
        // TODO: This is non-trivial! Somehow need to find the closest named font...
        // app.textFonts.getByName('HelveticaNeue-UltraLightItalic'), or iterate
        // the array and check other properties (e.g.:
        // app.textFonts[301].family === 'Helvetica Neue'
        // app.textFonts[301].name === 'HelveticaNeue-UltraLightItalic'
        // app.textFonts[301].style === 'UltraLight Italic')
        
        // from the DOM, we get
        // fontStyle (normal, italic, oblique)
        // fontWeight (normal, bold, bolder, lighter, 100-900)
        // fontStretch (ultra-condensed, extra-condensed, condensed, semi-condensed,
        //   normal, semi-expanded, expanded, extra-expanded, ultra-expanded)
        // ...though Adobe's font names as fontFamily work, though if you set something like
        // fontWeight on TOP of a weighted Adobe fontFamily, it will still override it
        // ... and dText.fontStretch actually doesn't.
        
        if (fontLookup.hasOwnProperty(lookupString)) {
            if (fontLookup[lookupString] !== null) {
                iTextRange.textFont = fontLookup[lookupString];
            }
            return;
        }
        
        for (f = 0; f < fontFamilies.length; f += 1) {
            fontFamily = fontFamilies[f].trim();
            
            // Use adobe's defaults for generic browser font families
            base = fontFamily.toLowerCase();
            if (base === 'sans-serif') {
                foundFont = app.textFonts.getByName('MyriadPro-Regular');
                break;
            } else if (base === 'serif') {
                foundFont = app.textFonts.getByName('MinionPro-Regular');
                break;
            }
            
            // Figure out the actual base font name
            base = fontFamily.split('-')[0].replace(/\s/, '');
            
            // Figure out font-stretch (Chrome doesn't support the font-stretch css property,
            // so we only use the font family string itself)
            i = fontFamily.search('Condensed');
            if (i !== -1) {
                stretch = fontFamily.substring(fontFamily.indexOf('-') + 1, i + 9);
            } else {
                i = fontFamily.search('Expanded');
                if (i !== -1) {
                    stretch = fontFamily.substring(fontFamily.indexOf('-') + 1, i + 8);
                } else {
                    stretch = "";
                }
            }
            
            // Apply any overrides
            if (fontStyle !== 'normal' || fontWeight !== 'normal') {
                // Figure out fontStyle
                if (fontStyle === 'normal') {
                    if (fontFamily.search('Italic') !== -1) {
                        fontStyle = 'Italic';
                    } else if (fontFamily.search('Oblique') !== -1) {
                        fontStyle = 'Oblique';
                    } else {
                        fontStyle = '';
                    }
                } else {
                    // convert from CSS styles; TODO: test all possibilities, don't just take the first!
                    if (FONT_STYLES.hasOwnProperty(fontStyle)) {
                        fontStyle = FONT_STYLES[fontStyle][0];
                    }
                }
                
                // Figure out fontWeight
                if (fontWeight === 'normal') {
                    // Whatever is left of the string...
                    fontWeight = fontFamily.replace(base + '-', '').replace(stretch, '').replace(fontStyle, '');
                } else {
                    // convert from CSS weights; TODO: test all possibilities, don't just take the first!
                    if (FONT_WEIGHTS.hasOwnProperty(fontWeight)) {
                        fontWeight = FONT_WEIGHTS[fontWeight][0];
                    }
                }
            }
            
            // First try the most specific name we can
            fontFamily = base + '-' + stretch + fontWeight + fontStyle;
            // TODO: try out different variants of style names (use dicts at the beginning of the file)
            // and different orders (sometimes stretch is last...?)
            try {
                foundFont = app.textFonts.getByName(fontFamily);
                break;
            } catch (e) {
                // Okay, just try the base font name, and ignore the styles
                try {
                    foundFont = app.textFonts.getByName(base);
                    break;
                } catch (err) {
                    // No luck... try the next item in the font stack
                }
            }
        }
        
        if (foundFont === null) {
            // Fail quietly
            console.logError({
                message : "Hanpuku could not resolve CSS font stack: " + lookupString,
                line : 174
            });
        } else {
            iTextRange.textFont = foundFont;
        }
        
        fontLookup[lookupString] = foundFont;
    }
    
    function applyColor(iC, dC) {
        var red, green, blue, black;
        
        if (dC.split('(').length < 2) {
            console.warn("Bad color:" + String(dC));
        }
        dC = dC.split('(')[1];
        dC = dC.split(')')[0];
        dC = dC.split(', ');
        
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
    
    function applyFillAndStroke(iItem, dItem) {
        var color;
        if (dItem.fill === 'none') {
            iItem.filled = false;
        } else {
            iItem.filled = true;
            if (iItem.fillColor === undefined) {
                iItem.fillColor = new RGBColor();
                color = iItem.fillColor;
            } else if (iItem.fillColor.typename === 'SpotColor') {
                // TODO: I really should connect to the existing
                // spot color if it hasn't changed:
                //color = iItem.fillColor.spot.color;
                iItem.fillColor = new RGBColor();
                color = iItem.fillColor;
            } else {
                color = iItem.fillColor;
            }
            applyColor(color, dItem.fill);
        }
        
        if (dItem.stroke === 'none') {
            if (iItem.typename === 'TextFrame') {
                iItem.strokeWeight = 0;
            } else {
                iItem.strokeWidth = 0;
            }
            iItem.stroked = false;
        } else {
            iItem.stroked = true;
            if (iItem.typename === 'TextFrame') {
                iItem.strokeWeight = dItem.strokeWidth;
            } else {
                iItem.strokeWidth = dItem.strokeWidth;
            }
            
            if (iItem.strokeColor === undefined) {
                iItem.strokeColor = new RGBColor();
                color = iItem.strokeColor;
            } else if (iItem.strokeColor.typename === 'SpotColor') {
                // TODO: I really should connect to the existing
                // spot color if it hasn't changed:
                //color = iItem.strokeColor.spot.color;
                iItem.strokeColor = new RGBColor();
                color = iItem.strokeColor;
            } else {
                color = iItem.strokeColor;
            }
            applyColor(color, dItem.stroke);
        }
        
        iItem.opacity = dItem.opacity * 100;
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
        // I can be cavalier about not matching the appropriate
        // segments, because attributes are shared across all segments
        for (i = 0; i < dCompPath.segments.length; i += 1) {
            if (iCompPath.pathItems.length > i) {
                // Just reuse the pathItem if it exists
                segment = iCompPath.pathItems[i];
            } else {
                // Otherwise create a new one
                segment = iCompPath.pathItems.add();
            }
            setPathPoints(segment, dCompPath.segments[i]);
        }
        for (i = iCompPath.pathItems.length - 1; i >= dCompPath.segments.length; i -= 1) {
            // Clean up any leftover pathItems
            iCompPath.pathItems[i].remove();
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
            y,
            temp;
        
        iText.name = dText.name;
        iText.contents = dText.contents;
        
        // Fonts
        
        iText.textRange.size = parseFloat(dText.fontSize);
        applyFont(iText.textRange,
                  dText.fontFamilies,
                  dText.fontStyle,
                  dText.fontWeight);
                  // dText.fontStretch);   // still unsupported in Chrome
        
        // TODO: dText.fontVariant (normal, small-caps)
        
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
                iText.characters[i].kerning = 1000 * parseFloat(dText.kerning[i]);    // We need thousandths of an em
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
        
        // Manually reset position, scale, and rotation before applying the
        // position information that we're getting from the DOM (this is the
        // best way I can figure out to set global coordinates)
        scale_x = Math.sqrt(iText.matrix.mValueA * iText.matrix.mValueA +
                            iText.matrix.mValueC * iText.matrix.mValueC);
        //scale_x = iText.matrix.mValueA < 0 ? -scale_x : scale_x;
        scale_y = Math.sqrt(iText.matrix.mValueB * iText.matrix.mValueB +
                            iText.matrix.mValueD * iText.matrix.mValueD);
        //scale_y = iText.matrix.mValueD < 0 ? -scale_y : scale_y;
        theta = Math.atan2(iText.matrix.mValueB, iText.matrix.mValueD);
        
        iText.translate(-iText.anchor[0], -iText.anchor[1]);
        iText.rotate(-theta * 180 / Math.PI, true, true, true, true, Transformation.DOCUMENTORIGIN);
        iText.resize(scale_x * 100, scale_y * 100, true, true, true, true, true, Transformation.DOCUMENTORIGIN);
        
        // Okay, now apply the values we got from the DOM
        iText.resize(dText.scaleX * 100, dText.scaleY * 100, true, true, true, true, true, Transformation.DOCUMENTORIGIN);
        iText.rotate(dText.theta * 180 / Math.PI, true, true, true, true, Transformation.DOCUMENTORIGIN);
        iText.translate(dText.x, dText.y);

        storeTag(iText, 'hanpuku_scale_x_0', dText.scaleX);
        storeTag(iText, 'hanpuku_scale_y_0', dText.scaleY);
        storeTag(iText, 'hanpuku_theta_0', dText.theta);
        storeTag(iText, 'hanpuku_x_0', dText.x);
        storeTag(iText, 'hanpuku_y_0', dText.y);
        
        // Generic attributes
        applyFillAndStroke(iText.textRange, dText);
        applyBasics(iText, dText);
    }
    
    function applyGroup(iGroup, dGroup) {
        //var itemOrder = dGroup.groups.concat(dGroup.paths, dGroup.text).sort(COMPARE_Z),
        var itemOrder = dGroup.groups.concat(dGroup.paths).concat(dGroup.text).sort(COMPARE_Z),
            i,
            j,
            newItem;
        
        iGroup.name = dGroup.name;
        iGroup.opacity = dGroup.opacity * 100;
        
        // Modify / add needed groups, paths, and text items in order
        for (i = 0; i < itemOrder.length; i += 1) {
            if (itemOrder[i].itemType === 'group') {
                try {
                    newItem = iGroup.groupItems.getByName(itemOrder[i].name);
                } catch (e1) {
                    newItem = iGroup.groupItems.add();
                }
                applyGroup(newItem, itemOrder[i]);
                try {
                    console.log('h', newItem.pathItems.getByName('V').strokeWidth);
                } catch (tempeh) {}
            } else if (itemOrder[i].itemType === 'path') {
                if (itemOrder[i].segments.length > 1) {
                    // This is a compound path
                    try {
                        newItem = iGroup.compoundPathItems.getByName(itemOrder[i].name);
                    } catch (e2) {
                        try {
                            // If this used to be a regular path, delete the old one
                            newItem = iGroup.pathItems.getByName(itemOrder[i].name);
                            newItem.remove();
                        } catch (e3) {}
                        newItem = iGroup.compoundPathItems.add();
                    }
                    applyCompoundPath(newItem, itemOrder[i]);
                } else {
                    // This is a regular path
                    try {
                        newItem = iGroup.pathItems.getByName(itemOrder[i].name);
                    } catch (e4) {
                        try {
                            // If this used to be a compound path, delete the old one
                            newItem = iGroup.compoundPathItems.getByName(itemOrder[i].name);
                            // TODO: for some reason app.redraw() at the end of the script nukes
                            // some of the changes to new pathItems (specifically, stroke weight)...
                            // ideally, I should replace
                            // the compoundPathItem with a regular pathItem instead of just using
                            // the first one inside the compoundPathItem:
                            //newItem.remove();
                            
                            for (j = 1; j < newItem.pathItems.length; j += 1) {
                                newItem.pathItems[j].remove();
                            }
                            newItem = newItem.pathItems[0];
                        } catch (e5) {
                            newItem = iGroup.pathItems.add();
                        }
                    }
                    applyPath(newItem, itemOrder[i]);
                }
            } else if (itemOrder[i].itemType === 'text') {
                try {
                    newItem = iGroup.textFrames.getByName(itemOrder[i].name);
                } catch (e6) {
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
    
    function applyDocument() {
        if (app.documents.length === 0) {
            app.documents.add();
        }
        activeDoc = app.activeDocument;
        var a, artboard, l, layer;
        
        // Modify / add needed artboards
        for (a = 0; a < doc.artboards.length; a += 1) {
            try {
                artboard = activeDoc.artboards.getByName(doc.artboards[a].name);
            } catch (e1) {
                artboard = activeDoc.artboards.add(doc.artboards[a].rect);
            }
            artboard.artboardRect = doc.artboards[a].rect;
            artboard.name = doc.artboards[a].name;
        }
        
        // Modify / add needed layers in order
        doc.layers = doc.layers.sort(COMPARE_Z);
        for (l = 0; l < doc.layers.length; l += 1) {
            try {
                layer = activeDoc.layers.getByName(doc.layers[l].name);
            } catch (e2) {
                layer = activeDoc.layers.add();
            }
            applyGroup(layer, doc.layers[l]);
            layer.zOrder(ZOrderMethod.BRINGTOFRONT);
        }
        // Remove any elements that were explicitly deleted in the DOM
        for (a = 0; a < doc.exit.length; a += 1) {
            try {
                activeDoc[ITEM_CONTAINERS[doc.exit[a].itemType]].getByName(doc.exit[a].name).remove();
            } catch (e3) {}
        }
    }
    
    try {
        applyDocument();
        app.redraw();
    } catch (e) {
        console.logError(e);
    }
    return console.jsonPacket();
}());