(function () {
    var alertedUnsupported = false,
        reservedNames = {   // All IDs in the panel are reserved, we include the empty
            "" : true       // string so that elements with no name will be given one
        },
        alphabetic = new RegExp('[A-Za-z]', 'g'),
        invalid = new RegExp('[^A-Za-z0-9-_]','g'),
        tagList = [
            "hanpuku_data",
            "hanpuku_classNames",
            "hanpuku_reverseTransform"
        ],
        textTagList = [
            "hanpuku_internalX",
            "hanpuku_internalY"
        ];
    
    function standardize(activeDoc) {
        var nameLookup = {};
        
        function standardizeItems(items, tagType) {
            var i,
                oldName,
                name,
                newName,
                freeId = 1,
                tag,
                t;
            
            for (i = 0; i < items.length; i += 1) {
                // Make sure item names begin with [A-Za-z] and contain only [A-Za-z0-9\-\_]
                // (jQuery / old DOM restrictions), and are unique (case-insensitive)
                oldName = items[i].name;
                name = oldName.replace(invalid, '_');
                if (name.length === 0) {
                    name = items[i].constructor.name;
                } else if (alphabetic.test(name[0]) !== true) {
                    name = items[i].constructor.name + '_' + name;
                }
                
                newName = name;
                while (reservedNames.hasOwnProperty(newName) || nameLookup.hasOwnProperty(newName)) {
                    newName = name + freeId;
                    freeId += 1;
                }
                items[i].name = newName;
                nameLookup[newName] = items[i];
                
                // Create the needed tags if they don't exist
                if (tagType === 'native' || tagType === 'text') {
                    for (t = 0; t < tagList.length; t += 1) {
                        try {
                            items[i].tags.getByName(tagList[t]);
                        } catch (e) {
                            tag = items[i].tags.add();
                            tag.name = tagList[t];
                            tag.value = 'null';
                        }
                    }
                }
                
                if (tagType === 'text') {
                    for (t = 0; t < textTagList.length; t += 1) {
                        try {
                            items[i].tags.getByName(textTagList[t]);
                        } catch (e) {
                            tag = items[i].tags.add();
                            tag.name = textTagList[t];
                            tag.value = 'null';
                        }
                    }
                }
            }
        }
        
        standardizeItems(activeDoc.artboards, 'artboards');
        standardizeItems(activeDoc.layers, 'layers');
        standardizeItems(activeDoc.pathItems, 'native');
        standardizeItems(activeDoc.groupItems, 'native');
        standardizeItems(activeDoc.textFrames, 'text');
        
        return nameLookup;
    }
    
    function extractColor(e, attr) {
        // TODO: If the activeDocument is in CMYK mode, add
        // device-cmyk(c,m,y,k) to the SVG element's style
        // with an rgb backup. For now, I stupidly convert
        // everything to RGB
        if (attr === 'fillColor' && e.filled === false) {
            return 'none';
        } else if (attr === 'strokeColor' && e.stroked === false) {
            return 'none';
        } else if (e.hasOwnProperty(attr) === false) {
            throw new Error(e.name + ' does not have color type: ' + attr);
        }
        
        if (e[attr].typename === 'RGBColor') {
            return 'rgb(' + e[attr].red + ',' +
                            e[attr].green + ',' +
                            e[attr].blue + ')';
        } else if (e[attr].typename === 'GrayColor') {
            return 'rgb(' + e[attr].gray + ',' +
                            e[attr].gray + ',' +
                            e[attr].gray + ')';
        } else if (e[attr].typename === 'CMYKColor') {
            return 'rgb(' + Math.floor(0.0255 * (100 - e[attr].cyan) * (100 - e[attr].black)) +
                      ',' + Math.floor(0.0255 * (100 - e[attr].magenta) * (100 - e[attr].black)) +
                      ',' + Math.floor(0.0255 * (100 - e[attr].yellow) * (100 - e[attr].black)) + ')';
            
            // TODO: switch to this once Chrome supports it
            //return 'device-cmyk(' + e[attr].cyan + ',' +
            //                        e[attr].magenta + ',' +
            //                        e[attr].yellow + ',' +
            //                        e[attr].black + ')';
        } else if (e[attr].typename === 'NoColor') {
            return 'none';
        } else {
            if (alertedUnsupported === false) {
                console.logError({
                    'message' : 'hanpuku does not yet support ' + e[attr].typename,
                    'line' : 70});
                alertedUnsupported = true;
            }
            return 'rgb(0,0,0)';
        }
    }
    
    function extractZPosition(e) {
        try {
            return e.zOrderPosition;
        } catch (e) {
            // TODO: there's a bug in Illustrator that causes an Internal error
            // if you attempt to get the zOrderPosition of an object inside a group
            return 100;
        }
    }
    
    function extractPathSegment(p) {
        var result = {
                points : [],
                closed : p.closed
            },
            pt,
            controlPoint;
        
        for (pt = 0; pt < p.pathPoints.length; pt += 1) {
            result.points.push({
                anchor : p.pathPoints[pt].anchor,
                leftDirection : p.pathPoints[pt].leftDirection,
                rightDirection : p.pathPoints[pt].rightDirection
            });
            for (controlPoint in result.points[pt]) {
                if (result.points[pt].hasOwnProperty(controlPoint)) {
                    // Illustrator has inverted Y coordinates
                    result.points[pt][controlPoint][1] = -result.points[pt][controlPoint][1];
                }
            }
        }
        
        return result;
    }
    
    function extractPath (p) {
        var output = {
            itemType : 'path',
            name : p.name,
            fill : extractColor(p, 'fillColor'),
            stroke : extractColor(p, 'strokeColor'),
            strokeWidth : p.strokeWidth,
            opacity : p.opacity / 100,
            segments : [extractPathSegment(p)],
            data : p.tags.getByName('hanpuku_data').value,
            classNames : p.tags.getByName('hanpuku_classNames').value,
            reverseTransform : p.tags.getByName('hanpuku_reverseTransform').value,
            zIndex : extractZPosition(p)
        };
        
        return output;
    }
    
    function extractCompoundPath (p) {
        var s,
            output = {
            itemType : 'path',
            name : p.name,
            fill : extractColor(p.pathItems[0], 'fillColor'),
            stroke : extractColor(p.pathItems[0], 'strokeColor'),
            strokeWidth : p.pathItems[0].strokeWidth,
            opacity : p.pathItems[0].opacity / 100,
            segments : [],
            data : p.tags.getByName('hanpuku_data').value,
            classNames : p.tags.getByName('hanpuku_classNames').value,
            reverseTransform : p.tags.getByName('hanpuku_reverseTransform').value,
            zIndex : extractZPosition(p)
        };
        
        for (s = 0; s < p.pathItems.length; s += 1) {
            output.segments.push(extractPathSegment(p.pathItems[s]));
        }
        
        return output;
    }
    
    function extractText(t) {
        var temp,
            i,
            k,
            b,
            r,
            output = {
                itemType : 'text',
                name : t.name,
                fill : extractColor(t.textRange, 'fillColor'),
                stroke : extractColor(t.textRange, 'strokeColor'),
                strokeWidth : t.textRange.strokeWeight,
                opacity : t.opacity / 100,
                contents : t.contents,
                data : t.tags.getByName('hanpuku_data').value,
                classNames : t.tags.getByName('hanpuku_classNames').value,
                reverseTransform : t.tags.getByName('hanpuku_reverseTransform').value,
                internalX : t.tags.getByName('hanpuku_internalX').value,
                internalY : t.tags.getByName('hanpuku_internalY').value,
                zIndex : extractZPosition(t)
            };
        
        // Extract justification
        if (output.contents.length === 0 || t.paragraphs[0].justification === Justification.LEFT) {
            output.justification = 'LEFT';
        } else if (t.paragraphs[0].justification === Justification.CENTER) {
            output.justification = 'CENTER';
        } else if (t.paragraphs[0].justification === Justification.RIGHT) {
            output.justification = 'RIGHT';
        } else {
            // TODO: support things like FULLJUSTIFYLASTLINELEFT?
            output.justification = 'LEFT';
        }
        
        // Extract per-character kerning, tracking, baseline shift, and rotation
        output.kerning = [];
        output.baselineShift = [];
        currentShift = 0;
        output.rotate = [];
        
        for (i = 0; i < t.characters.length; i += 1) {
            try {
                temp = t.characters[i].kerning;
            } catch (e) {
                temp = 0;   // TODO: support auto, optical
            }
            output.kerning.push(temp*1000 + 'em');
            
            output.baselineShift.push((-t.characters[i].baselineShift - currentShift) + 'pt');
            currentShift = -t.characters[i].baselineShift;
            
            output.rotate.push(t.characters[i].rotation + 'deg');
        }
        i = k = b = r = t.characters.length - 1;
        
        while (i >= 0) {
            if (i === k && output.kerning[i] === '0em') {
                k -= 1;
            }
            if (i === b && output.baselineShift[i] === '0pt') {
                b -= 1;
            }
            if (i === r && output.rotate[i] === '0deg') {
                r -= 1;
            }
            i -= 1;
        }
        
        output.kerning.splice(k+1);
        output.kerning = output.kerning.join(',');
        output.baselineShift.splice(b+1);
        output.baselineShift = output.baselineShift.join(',');
        output.rotate.splice(r+1);
        output.rotate = output.rotate.join(',');
        
        
        // Extract scale, rotation, and translation from Illustrator's
        // matrix property (translation seems to change all the time,
        // so I make a temporary TextFrame to get the frame of reference):
        temp = t.parent.textFrames.add();
        
        output.scale_x = Math.sqrt(t.matrix.mValueA*t.matrix.mValueA +
                                   t.matrix.mValueC*t.matrix.mValueC);
        output.scale_y = Math.sqrt(t.matrix.mValueB*t.matrix.mValueB +
                                   t.matrix.mValueD*t.matrix.mValueD);
        output.theta = Math.atan2(t.matrix.mValueB, t.matrix.mValueD);
        
        temp.resize(output.scale_x*100, output.scale_y*100, true, true, true, true, true, Transformation.DOCUMENTORIGIN);
        temp.rotate(output.theta*180/Math.PI, true, true, true, true, Transformation.DOCUMENTORIGIN);
        
        output.x = t.matrix.mValueTX - temp.matrix.mValueTX;
        output.y = t.matrix.mValueTY - temp.matrix.mValueTY;
        
        temp.remove();
        
        // TODO: convert more text properties!
        return output;
    }
    
    function extractGroup(g, iType) {
        var output = {
            itemType : iType,
            name : g.name,
            groups : [],
            paths : [],
            text : []
        },
            s,
            p,
            t;
        
        try {
            output.zIndex = g.zOrderPosition;
        } catch(e) {
            // TODO: there's a bug in Illustrator that causes an Internal error
            // if you attempt to get the zOrderPosition of an object inside a group
            output.zIndex = 100;
        }
        
        if (iType === 'group') {
            output.data = g.tags.getByName('hanpuku_data').value;
            output.classNames = g.tags.getByName('hanpuku_classNames').value;
            output.reverseTransform = g.tags.getByName('hanpuku_reverseTransform').value;
        }
        
        for (s = 0; s < g.groupItems.length; s += 1) {
            output.groups.push(extractGroup(g.groupItems[s], 'group'));
        }
        for (p = 0; p < g.pathItems.length; p += 1) {
            output.paths.push(extractPath(g.pathItems[p]));
        }
        for (p = 0; p < g.compoundPathItems.length; p += 1) {
            output.paths.push(extractCompoundPath(g.compoundPathItems[p]));
        }
        for (t = 0; t < g.textFrames.length; t += 1) {
            s = false;
            try {
                g.textFrames[t].tags.getByName('hanpuku_data');
                s = true;
            } catch (e) {
                // Just ignore text that wasn't generated by hanpuku
            }
            if (s === true) {
                output.text.push(extractText(g.textFrames[t]));
            }
        }
        return output;
    }
    
    function extractDocument() {
        var output = null;
    
        if (app.documents.length > 0) {
            var activeDoc = app.activeDocument,
                newBoard,
                left, right, top, bottom,
                a, l, s;
            
            if (activeDoc.activeLayer.name === 'Isolation Mode') {
                return "Isolation Mode Error";
            }
            
            standardize(activeDoc);
            
            output = {
                itemType : 'document',
                name : activeDoc.name.split('.')[0],
                artboards : [],
                layers : [],
                selection : []
            };
            
            for (a = 0; a < activeDoc.artboards.length; a += 1) {
                newBoard = {
                    name: activeDoc.artboards[a].name,
                    rect: activeDoc.artboards[a].artboardRect
                };
                // Illustrator has inverted Y coordinates
                newBoard.rect[1] = -newBoard.rect[1];
                newBoard.rect[3] = -newBoard.rect[3];
                
                // Update the bounds of the whole document
                if (left === undefined || left > newBoard.rect[0]) {
                    left = newBoard.rect[0];
                }
                if (top === undefined || top > newBoard.rect[1]) {
                    top = newBoard.rect[1];
                }
                if (right === undefined || right < newBoard.rect[2]) {
                    right = newBoard.rect[2];
                }
                if (bottom === undefined || bottom < newBoard.rect[3]) {
                    bottom = newBoard.rect[3];
                }
                
                output.artboards.push(newBoard);
            }
            output.left = left;
            output.top = top;
            output.right = right;
            output.bottom = bottom;
            for (l = 0; l < activeDoc.layers.length; l += 1) {
                output.layers.push(extractGroup(activeDoc.layers[l], 'layer'));
            }
            for (s = 0; s < activeDoc.selection.length; s += 1) {
                output.selection.push(activeDoc.selection[s].name);
            }
        }
        
        return output;
    }
    
    try {
        console.setOutput(extractDocument());
    } catch(e) {
        console.logError(e);
    }
    return console.jsonPacket();
})();