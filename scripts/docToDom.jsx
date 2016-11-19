/*globals console, Justification, Transformation, TextType, app*/
(function () {
    "use strict";
    var alertedUnsupported = false,
        supportedTypeNames = {
            'GroupItem' : true,
            'PathItem' : true
        },
        reservedNames = {   // All IDs in the panel are reserved, we include the empty
            "" : true       // string so that elements with no name will be given one
        },
        alphabetic = new RegExp('[A-Za-z]'),
        invalid = new RegExp('[^A-Za-z0-9-_]', 'g');
    // Technically, HTML ids are pretty permissive, however, jQuery chokes on periods and colons

    function getTag(item, name) {
        try {
            return item.tags.getByName(name).value;
        } catch (e) {
            return null;
        }
    }

    function standardize(activeDoc) {
        var nameLookup = {};

        function standardizeItems(items) {
            var i,
                oldName,
                name,
                newName,
                freeId = 1;

            for (i = 0; i < items.length; i += 1) {
                // Make sure item names begin with [A-Za-z] and contain only [A-Za-z0-9\-\_]
                // (jQuery / old DOM restrictions), and are unique (case-insensitive)
                oldName = items[i].name;

                // Enforce strict rules about valid characters (for jQuery's sake)
                name = oldName.replace(invalid, '_');
                if (name.length === 0) {
                    name = items[i].constructor.name;
                } else if (alphabetic.test(name.charAt(0)) !== true) {
                    // HTML ids must start with an alphabetic
                    name = items[i].constructor.name + '_' + name;
                }

                newName = name;
                while (reservedNames.hasOwnProperty(newName) || nameLookup.hasOwnProperty(newName)) {
                    newName = name + '_' + freeId;
                    freeId += 1;
                }
                items[i].name = newName;
                nameLookup[newName] = items[i];
            }
        }

        standardizeItems(activeDoc.artboards);
        standardizeItems(activeDoc.layers);
        standardizeItems(activeDoc.pathItems);
        standardizeItems(activeDoc.compoundPathItems);
        standardizeItems(activeDoc.groupItems);
        standardizeItems(activeDoc.textFrames);

        return nameLookup;
    }

    function extractColor(e, attr) {
        var color;
        // TODO: If the activeDocument is in CMYK mode, add
        // device-cmyk(c,m,y,k) to the SVG element's style
        // with an rgb backup. For now, I stupidly convert
        // everything to RGB
        if (attr === 'fillColor' && e.filled === false) {
            return 'none';
        } else if (attr === 'strokeColor' && e.stroked === false) {
            return 'none';
        } else if (e.hasOwnProperty(attr) === false) {
            throw new Error(e.name + ' does not have color attribute: ' + attr);
        }

        if (e[attr].typename === 'SpotColor') {
            color = e[attr].spot.color;
        } else {
            color = e[attr];
        }

        if (color.typename === 'RGBColor') {
            return 'rgb(' + color.red + ',' +
                            color.green + ',' +
                            color.blue + ') /*hanpuku_untouched*/';
        } else if (color.typename === 'GrayColor') {
            return 'rgb(' + color.gray + ',' +
                            color.gray + ',' +
                            color.gray + ') /*hanpuku_untouched*/';
        } else if (color.typename === 'CMYKColor') {
            return 'rgb(' + Math.floor(0.0255 * (100 - color.cyan) * (100 - color.black)) +
                      ',' + Math.floor(0.0255 * (100 - color.magenta) * (100 - color.black)) +
                      ',' + Math.floor(0.0255 * (100 - color.yellow) * (100 - color.black)) + ') /*hanpuku_untouched*/';

            // TODO: switch to this once Chrome supports it
            //return 'device-cmyk(' + color.cyan + ',' +
            //                        color.magenta + ',' +
            //                        color.yellow + ',' +
            //                        color.black + ')';
        } else if (color.typename === 'NoColor') {
            return 'none';
        } else {
            if (alertedUnsupported === false) {
                // send a warning, but don't fail
                console.logError({
                    'message' : 'Hanpuku does not yet support ' + color.typename + ' unless overridden, it will be ignored.',
                    'line' : 107
                });
                alertedUnsupported = true;
            }
            return 'rgb(0,0,0) /*hanpuku_unsupported:' + color.typename + '*/';
        }
    }

    function extractZPosition(e) {
        try {
            return e.absoluteZOrderPosition;
        } catch (e1) {
            try {
                return e.zOrderPosition;
            } catch (e2) {
                return 1;
            }
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

    function extractPath(p) {
        var output = {
            itemType : 'path',
            name : p.name,
            fill : extractColor(p, 'fillColor'),
            stroke : extractColor(p, 'strokeColor'),
            opacity : p.opacity / 100,
            segments : [extractPathSegment(p)],
            data : getTag(p, 'hanpuku_data'),
            classNames : getTag(p, 'hanpuku_classNames'),
            reverseTransform : getTag(p, 'hanpuku_reverseTransform'),
            zIndex : extractZPosition(p)
        };

        output.strokeWidth = output.stroke === 'none' ? 0 : p.strokeWidth;

        return output;
    }

    function extractCompoundPath(p) {
        var s,
            output = {
                itemType : 'path',
                name : p.name,
                fill : extractColor(p.pathItems[0], 'fillColor'),
                stroke : extractColor(p.pathItems[0], 'strokeColor'),
                opacity : p.pathItems[0].opacity / 100,
                segments : [],
                data : getTag(p, 'hanpuku_data'),
                classNames : getTag(p, 'hanpuku_classNames'),
                reverseTransform : getTag(p, 'hanpuku_reverseTransform'),
                zIndex : extractZPosition(p)
            };

        output.strokeWidth = output.stroke === 'none' ? 0 : p.pathItems[0].strokeWidth;

        for (s = 0; s < p.pathItems.length; s += 1) {
            output.segments.push(extractPathSegment(p.pathItems[s]));
        }

        return output;
    }

    function extractText(t) {
        var temp,
            currentShift,
            i,
            k,
            b,
            r,
            scale_x,
            scale_y,
            theta,
            x,
            y,
            output = {
                itemType : 'text',
                name : t.name,
                fill : extractColor(t.textRange, 'fillColor'),
                stroke : extractColor(t.textRange, 'strokeColor'),
                opacity : t.opacity / 100,
                contents : t.contents,
                data : getTag(t, 'hanpuku_data'),
                classNames : getTag(t, 'hanpuku_classNames'),
                reverseTransform : getTag(t, 'hanpuku_reverseTransform'),
                internalX : getTag(t, 'hanpuku_internalX'),
                internalY : getTag(t, 'hanpuku_internalY'),
                zIndex : extractZPosition(t),
                scale_x_0 : getTag(t, 'hanpuku_scale_x_0'),
                scale_y_0 : getTag(t, 'hanpuku_scale_y_0'),
                theta_0 : getTag(t, 'hanpuku_theta_0'),
                x_0 : getTag(t, 'hanpuku_x_0'),
                y_0 : getTag(t, 'hanpuku_y_0'),
                fontSize : t.textRange.size,
                fontFamily : t.textRange.textFont.name
            };

        output.strokeWidth = output.stroke === 'none' ? 0 : t.textRange.strokeWeight;

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
            output.kerning.push(temp * 1000 + 'em');

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

        output.kerning.splice(k + 1);
        output.kerning = output.kerning.join(',');
        output.baselineShift.splice(b + 1);
        output.baselineShift = output.baselineShift.join(',');
        output.rotate.splice(r + 1);
        output.rotate = output.rotate.join(',');


        // Extract the absolute scale, rotation, and translation
        //temp = t.parent.textFrames.add();

        scale_x = Math.sqrt(t.matrix.mValueA * t.matrix.mValueA +
                            t.matrix.mValueC * t.matrix.mValueC);
        //scale_x = t.matrix.mValueA < 0 ? -scale_x : scale_x;
        scale_y = Math.sqrt(t.matrix.mValueB * t.matrix.mValueB +
                            t.matrix.mValueD * t.matrix.mValueD);
        //scale_y = t.matrix.mValueD < 0 ? -scale_y : scale_y;
        theta = Math.atan2(t.matrix.mValueB, t.matrix.mValueD);

        // Illustrator actually changes the font size and textRange.horizontalScale (.verticalScale for some asian texts)
        // in response to scaling... we need to incorporate each of these
        scale_x = scale_x * t.textRange.horizontalScale / 100;
        scale_y = scale_y * t.textRange.verticalScale / 100;

        x = t.anchor[0];
        y = t.anchor[1];

        /*temp.resize(scale_x * 100, scale_y * 100, true, true, true, true, true, Transformation.DOCUMENTORIGIN);
        temp.rotate(theta * 180 / Math.PI, true, true, true, true, Transformation.DOCUMENTORIGIN);

        x = t.matrix.mValueTX - temp.matrix.mValueTX;
        y = t.matrix.mValueTY - temp.matrix.mValueTY;

        temp.remove();*/

        output.scale_x_1 = scale_x;
        output.scale_y_1 = scale_y;
        output.theta_1 = theta;
        output.x_1 = x;
        output.y_1 = y;

        // TODO: convert more text properties!
        return output;
    }

    function extractGroup(g, iType) {
        var output = {
            itemType : iType,
            name : g.name,
            opacity : g.opacity / 100,
            groups : [],
            paths : [],
            text : [],
            zIndex : extractZPosition(g)
        },
            s,
            p,
            t;

        if (iType === 'group') {
            output.data = getTag(g, 'hanpuku_data');
            output.classNames = getTag(g, 'hanpuku_classNames');
            output.reverseTransform = getTag(g, 'hanpuku_reverseTransform');
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
            // TODO: convert non-point based text?
            if (g.textFrames[t].kind === TextType.POINTTEXT) {
                output.text.push(extractText(g.textFrames[t]));
            }
        }
        return output;
    }

    function extractDocument() {
        var output = null,
            activeDoc,
            newBoard,
            left,
            right,
            top,
            bottom,
            a,
            l,
            s;

        if (app.documents.length > 0) {
            activeDoc = app.activeDocument;

            if (activeDoc.activeLayer.name === 'Isolation Mode') {
                return "Isolation Mode Error";
            }

            standardize(activeDoc);

            output = {
                itemType : 'document',
                name : activeDoc.name.split('.')[0].replace(invalid, '_'),
                artboards : [],
                layers : [],
                selection : []
            };
            if (alphabetic.test(output.name.charAt(0)) !== true) {
                // HTML ids must start with an alphabetic
                output.name = 'Document_' + output.name;
            }

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
                // Only include compatible objects
                if (supportedTypeNames.hasOwnProperty(activeDoc.selection[s].typename)) {
                    output.selection.push(activeDoc.selection[s].name);
                }
            }
        }

        return output;
    }

    try {
        console.setOutput(extractDocument());
    } catch (e) {
        console.logError(e);
    }
    return console.jsonPacket();
}());
