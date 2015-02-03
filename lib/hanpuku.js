/**
 * Monkey-patches additional functionality onto d3.js for making transitions to and from
 * Illustrator documents easier, as well as adding some Illustrator-like functionality to d3.js
 */
(function () {
    /* General-purpose functions */
    var magicCircleNumber = 4*(Math.sqrt(2)-1)/3,
        PATH_PRECISION = 8,
        Z_PRECISION = 0.1;
    
    function matMultiply(left, right) {
        // SVG matrix format:
        // 0 2 4
        // 1 3 5
        // - - -
        
        // Illustrator matrix format:
        // mValueA mValueC mValueTX
        // mValueB mValueD mValueTY
        // - - -
        return [
            left[0]*right[0] + left[2]*right[1],    // + left[4]*0
            left[1]*right[0] + left[3]*right[1],    // + left[5]*0
            left[0]*right[2] + left[2]*right[3],    // + left[4]*0
            left[1]*right[2] + left[3]*right[3],    // + left[5]*0
            left[0]*right[4] + left[2]*right[5] + left[4],  //*1
            left[1]*right[4] + left[3]*right[5] + left[5]   //*1
        ];
    }
    
    function matInvert(m) {
        // Inverse of SVG matrix
        
        // [  d  -c  cf-ed ]
        // [ -b   a  eb-af ] / (ad-bc)
        // [  0   0    1   ]
        
        var adbc = m[0]*m[3]-m[1]*m[2];
        return [
            m[3]/adbc,
            -m[1]/adbc,
            -m[2]/adbc,
            m[0]/adbc,
            (m[2]*m[5] - m[4]*m[3])/adbc,
            (m[4]*m[1] - m[0]*m[5])/adbc
        ];
    }
    
    function matPoint(m, x, y) {
        return [
            m[0]*x + m[2]*y + m[4],
            m[1]*x + m[3]*y + m[5]
        ];
    }
    window.hanpuku = {};
    window.hanpuku.matInvert = matInvert;
    window.hanpuku.matMultiply = matMultiply;
    window.hanpuku.matPoint = matPoint;
    
    /* Helper functions for converting circles, lines, rectangles, paths, and any object
     * to cubic-interpolated paths with absolute coordinates (and no nested transforms) */
    
    function getArrayOfNumbers(mainArray, startIndex, stopIndex, offsets) {
        var temp = [],
            i;
        offsets = offsets === undefined ? [0, 0] : offsets;
        for (i = startIndex; i <= stopIndex; i += 2) {
            temp.push(offsets[0] + Number(mainArray[i]));
            temp.push(offsets[1] + Number(mainArray[i+1]));
        }
        return temp;
    }
    function arcToCubic(A, rx, ry, theta, longflag, sweepflag, B) {
        if (rx === 0 || ry === 0) {
            return ['C', A[0], A[1], B[0], B[1], B[0], B[1]];
        }
        
        theta = theta * Math.PI / 180.0;
        var cosTheta = Math.cos(theta),
            sinTheta = Math.sin(theta);
        
        // Find the center (http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes)
        
        // Step 1
        var mat = [cosTheta, -sinTheta, sinTheta, cosTheta, 0, 0],
            halfDistance_x = (A[0]-B[0]) / 2,
            halfDistance_y = (A[1]-B[1]) / 2,
            v = matPoint(mat, halfDistance_x, halfDistance_y);
        
        // Standardize rx and ry (see "Out-of-range parameters")
        rx = Math.abs(rx);
        ry = Math.abs(ry);
        // Adjust rx and ry if the distance between A and B is too big
        var temp = (halfDistance_x * halfDistance_x) / (rx * rx) +
                   (halfDistance_y * halfDistance_y) / (ry * ry);
        if (temp > 1) {
            temp = Math.sqrt(temp);
            rx = temp * rx;
            ry = temp * ry;
        }
        
        // Step 2
        var vx2 = v[0] * v[0],
            vy2 = v[1] * v[1],
            rx2 = rx * rx,
            ry2 = ry * ry;
        temp = (longflag === sweepflag ? -1 : 1) *
                Math.sqrt(Math.abs((rx2 *ry2 - rx2 * vy2 - ry2 * vx2) /
                                   (rx2 * vy2 + ry2 * vx2)));
        var Cprime = [temp * rx * v[1] / ry,
                     -temp * ry * v[0] / rx];
        
        // Step 3
        mat = [cosTheta, sinTheta, -sinTheta, cosTheta, 0, 0];
        var C = matPoint(mat, Cprime[0], Cprime[1]);
        C[0] += (A[0] + B[0]) / 2;
        C[1] += (A[1] + B[1]) / 2;
        
        // Okay, now move the ellipse to the unit circle centered on 0,0
        mat = matMultiply([-cosTheta, -sinTheta, sinTheta, -cosTheta, 0, 0],
                          [1, 0, 0, 1, -C[0], -C[1]]);
        mat = matMultiply([1/rx, 0, 0, 1/ry, 0, 0], mat);
        
        A = matPoint(mat, A[0], A[1]);
        B = matPoint(mat, B[0], B[1]);
        
        // Figure out the angles at which to create segments (they can't
        // be longer than pi/4)
        var Aangle = Math.atan2(A[1],A[0]),
            Bangle = Math.atan2(B[1],B[0]),
            dTheta = sweepflag === '1' ? Bangle - Aangle : Aangle - Bangle,
            numSplits = 0,
            angles = [];
        
        while (dTheta > Math.PI / 4) {
            numSplits += 1;
            dTheta = dTheta / 2;
        }
        var i;
        angles.push(Aangle);
        for (i = 1; i < Math.pow(2,numSplits); i += 1) {
            angles.push(Aangle + i*dTheta);
        }
        angles.push(Bangle);
        
        // Create the segments
        var result = [],
            A0_2,
            A1_2,
            B0_2,
            B1_2,
            C0_2,
            C1_2;
        for (i = 1; i < angles.length; i += 1) {    // i = 1: don't need to re-write point A in the path commands
            result.push('C');
            
            // get the first, second, and center points on the circle
            A = [Math.cos(angles[i-1]),
                 Math.sin(angles[i-1])];
            B = [Math.cos(angles[i]),
                 Math.sin(angles[i])];
            C = [Math.cos((angles[i] + angles[i-1])/2),
                 Math.sin((angles[i] + angles[i-1])/2)];
            
            A0_2 = A[0] * A[0];
            A1_2 = A[1] * A[1];
            B0_2 = B[0] * B[0];
            B1_2 = B[1] * B[1];
            C0_2 = C[0] * C[0];
            C1_2 = C[1] * C[1];
            
            // the left control point is the intersection of the tangent
            // lines at A and C
            
            // x-coordinate
            if (A[1] === 0) {   // Special cases where tangents have undefined slopes
                result.push(A[0]);
            } else if (C[1] === 0) {
                result.push(C[0]);
            } else {
                result.push((A0_2*C[1] + A1_2*C[1] - A[1]*(C0_2 + C1_2)) / (A[0]*C[1] - A[1]*C[0]));
            }
            // y-coordinate
            result.push((-A0_2*C[0] + A[0]*C0_2 + A[0]*C1_2 - A1_2*C[0]) / (A[0]*C[1] - A[1]*C[0]));
            
            // the right control point is the intersection of the tangent
            // lines at B and C
            
            // x-coordinate
            if (B[1] === 0) {   // Special cases where tangents have undefined slopes
                result.push(A[0]);
            } else if (C[1] === 0) {
                result.push(C[0]);
            } else {
                result.push((B0_2*C[1] + B1_2*C[1] - B[1]*(C0_2 + C1_2)) / (B[0]*C[1] - B[1]*C[0]));
            }
            // y-coordinate
            result.push((-B0_2*C[0] + B[0]*C0_2 + B[0]*C1_2 - B1_2*C[0]) / (B[0]*C[1] - B[1]*C[0]));
            
            // finally, add point B
            result.push(B[0]);
            result.push(B[1]);
            result.push('M');
            result.push(A[0]);
            result.push(A[1]);
            result.push('L');
            result.push(result[result.length-10]);
            result.push(result[result.length-10]);
            result.push('M');
            result.push(B[0]);
            result.push(B[1]);
            result.push('L');
            result.push(result[result.length-14]);
            result.push(result[result.length-14]);
            result.push('M');
            result.push(B[0]);
            result.push(B[1]);
        }
        
        // Convert back to the ellipse
        mat = matInvert(mat);
        i = 0;
        while (i < result.length) {
            if (typeof result[i] === 'string') {
                i += 1;
            } else {
                temp = matPoint(mat, result[i], result[i+1]);
                result[i] = temp[0];
                result[i+1] = temp[1];
                i += 2;
            }
        }
        return result;
    }
    function pathToCubicPath(d, m) {
        if (d === null) {
            throw new Error('Null path string: ' + d);
        }
        if (d.indexOf('NaN') !== -1) {
            throw new Error('Hanpuku Error: NaN in path string: ' + d);
        }
        var dParts = d.split(/,|\s+/),
            temp,
            lastAnchor = [0,0],
            lastCubicControl,
            controlPoint,
            anchorType,
            lastAnchorType,
            i = 0,
            j,
            result = [],
            currentSegment,
            numControlPoints = 0;
        
        if (m === undefined) {
            m = [1, 0, 0, 1, 0, 0];
        }
        
        // Need to separate the coordinates stuck to letters,
        // and remove empty entries while we're at it
        while (i < dParts.length) {
            if (dParts[i] === "") {
                dParts.splice(i,1);
            } else {
                temp = dParts[i].search(/[^\d\-\.e]/);
                if (temp !== -1 && dParts[i].length > 1) {
                    // There's a letter in this chunk; split
                    // it into whatever is before, the letter, and
                    // whatever is after, and then start over without
                    // incrementing i
                    dParts.splice(i,1,
                            dParts[i].substring(0,temp),
                            dParts[i][temp],
                            dParts[i].substr(temp+1));
                    continue;
                } else {
                    i += 1;
                }
            }
        }
        
        // Okay, now parse the commands
        i = 0;
        while (i < dParts.length) {
            // Illustrator can't handle paths longer than 1000 control points; I split
            // by 900 just to be safe
            if (numControlPoints >= 900) {
                numControlPoints = 1;
                result.push(['M', lastAnchor[0], lastAnchor[1]]);
            }
            
            numControlPoints += 1;
            currentSegment = result.length - 1;
            
            anchorType = dParts[i].toUpperCase();
            
            if (dParts[i] === 'C' || dParts[i] === 'c') {
                // This is by far the most common, so we'll start here for
                // performance
                result[currentSegment].push('C');
                temp = getArrayOfNumbers(dParts, i+1, i+6,
                                         dParts[i] === 'c' ? lastAnchor : undefined);
                
                result[currentSegment].push(temp[0]);
                result[currentSegment].push(temp[1]);
                
                result[currentSegment].push(temp[2]);
                result[currentSegment].push(temp[3]);
                
                result[currentSegment].push(temp[4]);
                result[currentSegment].push(temp[5]);
                
                i += 7;
                lastAnchor = [temp[4],temp[5]];
                lastCubicControl = [temp[2],temp[3]];
            } else if (dParts[i] === 'M' || dParts[i] === 'm') {
                temp = getArrayOfNumbers(dParts, i+1, i+2,
                                         dParts[i] === 'm' ? lastAnchor : undefined);
                // Start a new segment
                currentSegment += 1;
                result.push(['M']);
                
                result[currentSegment].push(temp[0]);
                result[currentSegment].push(temp[1]);
                
                i += 3;
                lastAnchor = lastCubicControl = temp;
            } else if (dParts[i] === 'Z' || dParts[i] === 'z') {
                temp = result[currentSegment].length;
                if (Math.abs(result[currentSegment][1] - result[currentSegment][temp - 2]) > Z_PRECISION ||
                    Math.abs(result[currentSegment][2] - result[currentSegment][temp - 1]) > Z_PRECISION) {
                    // If the endpoint and starting point are not the same, we need to add
                    // a straight (cubic) line connecting the two
                    result[currentSegment].push('C');
                    
                    result[currentSegment].push(result[currentSegment][temp-2]);
                    result[currentSegment].push(result[currentSegment][temp-1]);
                    
                    result[currentSegment].push(result[currentSegment][1]);
                    result[currentSegment].push(result[currentSegment][2]);
                    
                    result[currentSegment].push(result[currentSegment][1]);
                    result[currentSegment].push(result[currentSegment][2]);
                }
                
                result[currentSegment].push('Z');
                i += 1;
                lastAnchor = lastCubicControl = [result[currentSegment][1], result[currentSegment][2]];
            } else if (dParts[i] === 'H' || dParts[i] === 'h') {
                temp = [Number(dParts[i+1]), lastAnchor[1]];
                if (dParts[i] === 'h') {
                    temp[0] += lastAnchor[0];
                }
                result[currentSegment].push('C');
                
                result[currentSegment].push(lastAnchor[0]);
                result[currentSegment].push(lastAnchor[1]);
                
                result[currentSegment].push(temp[0]);
                result[currentSegment].push(temp[1]);
                
                result[currentSegment].push(temp[0]);
                result[currentSegment].push(temp[1]);
                
                i += 2;
                lastAnchor = lastCubicControl = temp;
            } else if (dParts[i] === 'V' || dParts[i] === 'v') {
                temp = [lastAnchor[0], Number(dParts[i+1])];
                if (dParts[i] === 'v') {
                    temp[1] += lastAnchor[1];
                }
                result[currentSegment].push('C');
                
                result[currentSegment].push(lastAnchor[0]);
                result[currentSegment].push(lastAnchor[1]);
                
                result[currentSegment].push(temp[0]);
                result[currentSegment].push(temp[1]);
                
                result[currentSegment].push(temp[0]);
                result[currentSegment].push(temp[1]);
                
                i += 2;
                lastAnchor = lastCubicControl = temp;
            } else if (dParts[i] === 'L' || dParts[i] === 'l') {
                temp = getArrayOfNumbers(dParts, i+1, i+2,
                                         dParts[i] === 'l' ? lastAnchor : undefined);
                result[currentSegment].push('C');
                
                result[currentSegment].push(lastAnchor[0]);
                result[currentSegment].push(lastAnchor[1]);
                
                result[currentSegment].push(temp[0]);
                result[currentSegment].push(temp[1]);
                
                result[currentSegment].push(temp[0]);
                result[currentSegment].push(temp[1]);
                
                i += 3;
                lastAnchor = lastCubicControl = temp;
            } else if (dParts[i] === 'Q' || dParts[i] === 'q') {
                temp = getArrayOfNumbers(dParts, i+1, i+4,
                                         dParts[i] === 'q' ? lastAnchor : undefined);
                result[currentSegment].push('C');
                
                // The first cubic control point is approximately 2/3 the distance between
                // the last anchor and the quadratic control
                result[currentSegment].push((2*temp[0] + lastAnchor[0])/3);
                result[currentSegment].push((2*temp[1] + lastAnchor[1])/3);
                
                // The second cubic control point is approximately 2/3 the distance between
                // the new point and the quadratic control
                lastCubicControl = [(2*temp[0] + temp[2])/3,
                                    (2*temp[1] + temp[3])/3];
                result[currentSegment].push(lastCubicControl[0]);
                result[currentSegment].push(lastCubicControl[1]);
                
                result[currentSegment].push(temp[2]);
                result[currentSegment].push(temp[3]);
                
                i += 5;
                lastAnchor = [temp[2],temp[3]];
            } else if (dParts[i] === 'T' || dParts[i] === 't') {
                temp = getArrayOfNumbers(dParts, i+1, i+2,
                                         dParts[i] === 't' ? lastAnchor : undefined);
                result[currentSegment].push('C');
                
                if (lastAnchorType === 'Q' || lastAnchorType === 'T') {
                    // new quadratic control = anchor + 3*(anchor - last cubic control)/2
                    controlPoint = [lastAnchor[0] + 3*(lastAnchor[0] - lastCubicControl[0])/2,
                                    lastAnchor[1] + 3*(lastAnchor[1] - lastCubicControl[1])/2];
                } else {
                    // Per SVG spec, if the last anchor wasn't Q, q, T or t, we
                    // use the last anchor point
                    controlPoint = lastAnchor;
                }
                
                // The first cubic control point is approximately 2/3 the distance between
                // the last anchor and the quadratic control
                result[currentSegment].push((2*controlPoint[0] + lastAnchor[0])/3);
                result[currentSegment].push((2*controlPoint[1] + lastAnchor[1])/3);
                
                // The second cubic control point is approximately 2/3 the distance between
                // the new point and the quadratic control
                lastCubicControl = [(2*controlPoint[0] + temp[0])/3,
                                    (2*controlPoint[1] + temp[1])/3];
                result[currentSegment].push(lastCubicControl[0]);
                result[currentSegment].push(lastCubicControl[1]);
                
                result[currentSegment].push(temp[0]);
                result[currentSegment].push(temp[1]);
                
                i += 3;
                lastAnchor = temp;
            } else if (dParts[i] === 'S' || dParts[i] === 's') {
                temp = getArrayOfNumbers(dParts, i+1, i+4,
                                         dParts[i] === 's' ? lastAnchor : undefined);
                if (lastAnchorType === 'C' || lastAnchorType === 'S') {
                    // Need to reflect the last control point to get
                    // the new first control point
                    controlPoint = [2*lastAnchor[0] - lastCubicControl[0],
                                    2*lastAnchor[1] - lastCubicControl[1]];
                } else {
                    // Per SVG spec, if the last anchor wasn't C, c, S or s, we
                    // use the last anchor point
                    controlPoint = lastAnchor;
                }
                
                result[currentSegment].push(controlPoint[0]);
                result[currentSegment].push(controlPoint[1]);
                
                result[currentSegment].push(temp[0]);
                result[currentSegment].push(temp[1]);
                
                result[currentSegment].push(temp[2]);
                result[currentSegment].push(temp[3]);
                
                i += 5;
                lastAnchor = [temp[2],temp[3]];
                lastCubicControl = [temp[0],temp[1]];
            } else if (dParts[i] === 'A' || dParts[i] === 'a') {
                throw new Error('Hanpuku Error: Arc paths are not yet supported.');
                /*
                // Only the last parameter is actually a coordinate
                temp = getArrayOfNumbers(dParts, i+6, i+7, m,
                                         dParts[i] === 'a' ? lastAnchor : undefined);
                
                temp = arcToCubic(lastAnchor,
                                  Number(dParts[i+1]),  // rx
                                  Number(dParts[i+2]),  // ry
                                  Number(dParts[i+3]),  // x rotation
                                  dParts[i+4],  // large arc
                                  dParts[i+5],  // sweep
                                  temp);
                
                result[currentSegment] = result[currentSegment].concat(temp);
                
                i += 8;
                lastAnchor = lastCubicControl = [temp[temp.length - 2],temp[temp.length - 1]]; */
            } else {
                throw new Error('Hanpuku Error: Unsupported path command: ' + dParts[i]);
            }
            lastAnchorType = anchorType;
        }
        
        // Apply m, and stitch the result together... for convenience down the road,
        // I surround commands with spaces, and put a single comma between
        // arguments
        d = "";
        for (i = 0; i < result.length; i += 1) {
            j = 0;
            while (j < result[i].length) {
                if (j > 0 || i > 0) {
                    d += ' ';
                }
                d += result[i][j];
                
                if (result[i][j] === 'M') {
                    d += ' ';
                    temp = matPoint(m, result[i][j + 1], result[i][j + 2]);
                    d += temp[0].toFixed(PATH_PRECISION) + ',';
                    d += temp[1].toFixed(PATH_PRECISION);
                    j += 3;
                } else if (result[i][j] === 'C') {
                    d += ' ';
                    temp = matPoint(m, result[i][j + 1], result[i][j + 2]);
                    d += temp[0].toFixed(PATH_PRECISION) + ',';
                    d += temp[1].toFixed(PATH_PRECISION) + ',';
                    temp = matPoint(m, result[i][j + 3], result[i][j + 4]);
                    d += temp[0].toFixed(PATH_PRECISION) + ',';
                    d += temp[1].toFixed(PATH_PRECISION) + ',';
                    temp = matPoint(m, result[i][j + 5], result[i][j + 6]);
                    d += temp[0].toFixed(PATH_PRECISION) + ',';
                    d += temp[1].toFixed(PATH_PRECISION);
                    j += 7;
                } else if (result[i][j] === 'Z') {    // Z
                    j += 1;
                } else {
                    console.warn(result, result[i][j], i, j);
                    throw "Bad d character";
                }
            }
        }
        return d;
    }
    
    function lineToCubicPath(x1, y1, x2, y2, m) {
        return  pathToCubicPath(
            "M" + x1 + "," + y1 +
            "L" + x2 + "," + y2 +
            "Z",
        m);
    }
    
    function rectToCubicPath(x, y, width, height, m) {
        return  pathToCubicPath(
            "M" + x + "," + y +
            "L" + (x + width) + "," + y +
            "L" + (x + width) + "," + (y + height) +
            "L" + x + "," + (y + height) +
            "L" + x + "," + y +
            "Z",
        m);
    }
    
    function circleToCubicPath(cx, cy, r, m) {
        return  pathToCubicPath(
            "M" + cx + "," + (cy - r) +    // top
            "C" + (cx + r * magicCircleNumber) + "," + (cy - r) + "," +
                  (cx + r) + "," + (cy - r * magicCircleNumber) + "," +
                  (cx + r) + "," + cy +    // right
            "C" + (cx + r) + "," + (cy + r * magicCircleNumber) + "," +
                  (cx + r / 2) + "," + (cy + r) + "," +
                  cx + "," + (cy + r) +    // bottom
            "C" + (cx - r / 2) + "," + (cy + r) + "," +
                  (cx - r) + "," + (cy + r * magicCircleNumber) + "," +
                  (cx - r) + "," + cy +    // left
            "C" + (cx - r) + "," + (cy - r * magicCircleNumber) + "," +
                  (cx - r / 2) + "," + (cy - r) + "," +
                  cx + "," + (cy - r) +    // top
            "Z",
        m);
    }
    
    function standardizeTextAttribute(e, attr, unit) {
        var temp,
            list;
        
        temp = e.getAttribute(attr);
        if (temp !== null) {
            list = temp.split(/,|\s+/).splice(0,e.textContent.length);    // doesn't need to be longer than the contents
            
            if (list.length === 0) {
                e.removeAttribute(attr);
                return;
            }
            for (i = 0; i < list.length; i += 1) {
                if (i < list.length) {
                    // Illustrator requires specific units
                    list[i] = convertUnits(e, list[i], unit);
                }
            }
            e.setAttribute(attr, list.join(','));
        }
    }
    
    function standardizeText(e, m) {
        if (e.hasAttribute('hanpuku_nonNativeTransform')) {
            // Already standardized
            return;
        }
        
        var newAnchor,
            scale_x = Math.sqrt(m[0]*m[0] + m[2]*m[2]),
            scale_y = Math.sqrt(m[1]*m[1] + m[3]*m[3]),
            theta = Math.atan2(m[1], m[3]),
            x = e.hasAttribute('x') ? parseFloat(e.getAttribute('x')) : 0,
            y = e.hasAttribute('y') ? parseFloat(e.getAttribute('y')) : 0;
        
        // Flatten the x and y coordinates into the transforms
        // that we'll pass to Illustrator
        newAnchor = matPoint(m, x, y);
        
        // Collect the low-level local transforms that Illustrator needs - converting
        // will rely on these, not the SVG transform tag
        e.setAttribute('hanpuku_x', newAnchor[0]);
        e.setAttribute('hanpuku_y', newAnchor[1]);
        e.setAttribute('hanpuku_scale_x', scale_x);
        e.setAttribute('hanpuku_scale_y', scale_y);
        e.setAttribute('hanpuku_theta', theta);
        
        // a new (temporary) SVG transform tag that contains the
        // flattened chain of ancestral matrices, minus
        // the internal x,y coordinates
        e.setAttribute('transform', 'matrix(' + m.join(',') + ')');
        e.setAttribute('hanpuku_nonNativeTransform', true);
        
        // Figure out per-character stuff
        
        // Baseline shift
        standardizeTextAttribute(e, 'dy', 'pt');
        
        // Rotation (per-character)
        standardizeTextAttribute(e, 'rotate', 'deg');
        
        // Kerning
        standardizeTextAttribute(e, 'dx', 'em');
        
        // Flatten (and ignore) tspan elements
        e.textContent = e.textContent;
    }
    
    function convertNodeToPath () {
        // Copy the element's attributes and d3-assigned
        // data to a new path element. Don't copy attributes that are being replaced
        // (the extra arguments)
        
        var e = arguments[0],
            d = arguments[1],
            id = e.getAttribute('id'),
            newNode = document.createElementNS(e.namespaceURI,'path'),
            a,
            i,
            ignore,
            data;
        for (a in e.attributes) {
            if (e.attributes.hasOwnProperty(a) &&
                    a !== 'length') {
                ignore = false;
                for (i = 2; i < arguments.length; i += 1) {
                    if (e.attributes[a].nodeName === arguments[i]) {
                        ignore = true;
                        break;
                    }
                }
                if (ignore === false) {
                    newNode.setAttribute(e.attributes[a].nodeName, e.attributes[a].value);
                }
            }
        }
        newNode.setAttribute('d', d);
        
        data = d3.select('#' + id).data();
        e.parentNode.replaceChild(newNode, e);
        d3.select('#' + id).data(data);
        return newNode;
    }
    
    function elementToCubicPaths(e, m, preserveReverseTransforms) {
        var transform,
            r,
            reverseTransform,
            temp,
            stringMode,
            params,
            i,
            j,
            cosTheta,
            sinTheta,
            rotation,
            d;
        
        // Apply all transformations
        if (m === undefined) {
            m = [1,0,0,1,0,0];
        }
        transform = e.getAttribute('transform');
        
        if (transform !== null && !e.hasAttribute('hanpuku_nonNativeTransform')) {
            transform = transform.split(')');
            r = [1,0,0,1,0,0];
            
            for (i = 0; i < transform.length; i += 1) {
                if (transform[i] === "") {
                    continue;
                }
                temp = transform[i].split('(');
                stringMode = temp[0].trim().toLowerCase();
                params = temp[1].split(/,|\s+/);
                for (j = 0; j < params.length; j += 1) {
                    params[j] = parseFloat(params[j]);
                    if (isNaN(params[j])) {
                        throw new Error('Hanpuku error: can\'t parse transformation string: ' + e.getAttribute('transform'));
                    }
                }
                
                if (stringMode === 'translate') {
                    m = matMultiply(m, [1,0,0,1, params[0], params[1]]);
                    r = matMultiply(r, [1,0,0,1,-params[0],-params[1]]);
                } else if (stringMode === 'scale') {
                    m = matMultiply(m, [  params[0],0,0,  params[1],0,0]);
                    r = matMultiply(r, [1/params[0],0,0,1/params[1],0,0]);
                } else if (stringMode === 'matrix') {
                    m = matMultiply(m, params);
                    r = matMultiply(r, matInvert(params));
                } else if (stringMode === 'rotate') {
                    temp = params[0]*Math.PI / 180;
                    cosTheta = Math.cos(temp);
                    sinTheta = Math.sin(temp);
                    m = matMultiply(m, [cosTheta, sinTheta, -sinTheta, cosTheta, 0, 0]);
                    r = matMultiply(r, [cosTheta, -sinTheta, sinTheta, cosTheta, 0, 0]);
                } else {
                    throw new Error('Hanpuku error: ' + stringMode + ' transforms are not yet supported.');
                }
            }
            
            e.removeAttribute('transform');
            if (preserveReverseTransforms) {
                reverseTransform = "matrix(";
                for (j = 0; j < r.length; j += 1) {
                    if (j > 0) {
                        reverseTransform += ',';
                    }
                    reverseTransform += r[j].toFixed(PATH_PRECISION);
                }
                reverseTransform += ')';
                
                e.setAttribute('hanpuku_reverseTransform', reverseTransform);
            }
        }
        
        // Get a cubic-interpolated path string for each element type, or recurse if a group
        if (e.tagName === 'rect') {
            // Convert rect to cubic-interpolated path
            d = rectToCubicPath(Number(e.getAttribute('x')),
                                Number(e.getAttribute('y')),
                                Number(e.getAttribute('width')),
                                Number(e.getAttribute('height')),
                                m);
            e = convertNodeToPath(e, d, 'x','y','width','height');
        } else if (e.tagName === 'circle') {
            // Convert circle to cubic-interpolated path
            d = circleToCubicPath(Number(e.getAttribute('cx')),
                                  Number(e.getAttribute('cy')),
                                  Number(e.getAttribute('r')),
                                  m);
            e = convertNodeToPath(e, d, 'cx','cy','r');
        } else if (e.tagName === 'line') {
            d = lineToCubicPath(Number(e.getAttribute('x1')),
                                Number(e.getAttribute('y1')),
                                Number(e.getAttribute('x2')),
                                Number(e.getAttribute('y2')),
                                m);
            e = convertNodeToPath(e, d, 'x1','y1','x2','y2');
        } else if (e.tagName === 'path') {
            d = e.getAttribute('d');
            if (d !== null) {
                e.setAttribute('d', pathToCubicPath(d, m));
            }
        } else if (e.tagName === 'text') {
            standardizeText(e, m);
        } else if (e.tagName === 'g' || e.tagName === 'svg') {
            for (i = 0; i < e.childNodes.length; i += 1) {
                elementToCubicPaths(e.childNodes[i], m, preserveReverseTransforms);
            }
        } else {
            throw new Error('Hanpuku Error: tag ' + e.tagName + ' is not yet supported.');
        }
    }
    
    /* Monkey-patched functions */
    /* These are important to allow d3 to work with a DOM that has
       gone through Illustrator; Illustrator applies all transforms
       immediately instead of as an attribute, and every shape is
       a cubic-interpolated path. These monkey-patched functions
       apply transforms behind the scenes and convert shapes to
       cubic-interpolated paths, and allow the programmer to treat
       paths as if they were still rect, circle, or non-cubic paths */
    
    d3.selection.prototype.appendClone = function (idToClone) {
        var self = this;
        
        function constructClone (proto, clone) {
            var a,
                attrib,
                c,
                child,
                copyId,
                copyNumber = 1;
            
            for (a in proto.attributes) {
                if (proto.attributes.hasOwnProperty(a) && a !== 'length') {
                    attrib = proto.attributes[a].name;
                    if (attrib === 'id') {
                        copyId = proto.getAttribute(attrib) + "Copy" + copyNumber;
                        while (document.getElementById(copyId) !== null) {
                            copyNumber += 1;
                            copyId = proto.getAttribute(attrib) + "Copy" + copyNumber;
                        }
                        clone.attr('id', copyId);
                    } else {
                        clone.attr(attrib, proto.getAttribute(attrib));
                    }
                }
            }
            
            for (c = 0; c < proto.childNodes.length; c += 1) {
                child = clone.append(proto.childNodes[c].tagName);
                constructClone(proto.childNodes[c], child);
            }
        }
        
        if (typeof idToClone === 'function') {
            var clones = [];
            self.each(function (d, i) {
                var proto = document.getElementById(idToClone.call(this, d)),
                    clone = d3.select(this).append(proto.tagName);
                constructClone(proto, clone);
                clones.push(clone[0][0]);
            });
            return d3.selectAll(clones);
        } else {
            var proto = document.getElementById(idToClone),
                clone = self.append(proto.tagName);
            constructClone(proto, clone);
            return clone;
        }
    };
    d3.selection.enter.prototype.appendClone = d3.selection.prototype.appendClone;
    
    d3.selection.prototype.circleAttr = function (cx, cy, r) {
        var self = this;
        return self.attr('d', function (d, i) {
                var d_cx = typeof cx === 'function' ? cx.call(this, d, i) : cx,
                    d_cy = typeof cy === 'function' ? cy.call(this, d, i) : cy,
                    d_r = typeof r === 'function' ? r.call(this, d, i) : r;
                return circleToCubicPath(d_cx, d_cy, d_r);
            });
    };
    
    d3.selection.prototype.rectAttr = function (x, y, width, height) {
        var self = this;
        return self.attr('d', function (d, i) {
                var d_x = typeof x === 'function' ? x.call(this, d, i) : x,
                    d_y = typeof y === 'function' ? y.call(this, d, i) : y,
                    d_width = typeof width === 'function' ? width.call(this, d, i) : width,
                    d_height = typeof height === 'function' ? height.call(this, d, i) : height;
                return rectToCubicPath(d_x, d_y, d_width, d_height);
            });
    };
    
    d3.selection.prototype.lineAttr = function (x1, y1, x2, y2) {
        var self = this;
        return self.attr('d', function (data, i) {
                var d_x1 = typeof x1 === 'function' ? x1.call(this, data, i) : x1,
                    d_y1 = typeof y1 === 'function' ? y1.call(this, data, i) : y1,
                    d_x2 = typeof x2 === 'function' ? x2.call(this, data, i) : x2,
                    d_y2 = typeof y2 === 'function' ? y2.call(this, data, i) : y2;
                return lineToCubicPath(d_x1, d_y1, d_x2, d_y2);
            });
    };
    
    d3.selection.prototype.pathAttr = function (d) {
        var self = this;
        return self.attr('d', function (data, i) {
                var d_d = typeof d === 'function' ? d.call(this, data, i) : d;
                return pathToCubicPath(d_d);
            });
    };
    
    /**
     * Extra goodies monkey-patched on to selections (useful for manipulating
     * selections with existing objects more like Illustrator)
     */
    d3.selection.prototype.standardize = function (m, preserveReverseTransforms) {
        var self = this;
        self.each(function (d, i) {
            var e = this;
            elementToCubicPaths(e, m, preserveReverseTransforms);
        });
    };
    d3.ANCHORS = {
        'TOP_LEFT' : 0,
        'TOP_CENTER' : 1,
        'TOP_RIGHT' : 2,
        'MIDDLE_LEFT' : 3,
        'MIDDLE_CENTER' : 4,
        'MIDDLE_RIGHT' : 5,
        'BOTTOM_LEFT' : 6,
        'BOTTOM_CENTER' : 7,
        'BOTTOM_RIGHT' : 8
    };
    var ANCHOR_OFFSET = {
        0 : [-0.5,-0.5],
        1 : [0,-0.5],
        2 : [0.5,-0.5],
        3 : [-0.5,0],
        4 : [0,0],
        5 : [0.5,0],
        6 : [-0.5,0.5],
        7 : [0,0.5],
        8 : [0.5,0.5]
    };
    d3.selection.prototype.setGlobalPosition = function (x, y, anchor) {
        var self = this;
        if (anchor === undefined) {
            anchor = d3.ANCHORS.MIDDLE_CENTER;
        }
        return self.setGlobalTransform(function (d, i, e_bounds) {
            var d_x = typeof x === 'function' ? x.call(this, d, i) : x,
                d_y = typeof y === 'function' ? y.call(this, d, i) : y,
                d_anchor = typeof anchor === 'function' ? anchor.call(this, d, i) : anchor;
            
            return [1,0,0,1,
                    d_x + ANCHOR_OFFSET[d_anchor][0] * e_bounds.width,
                    d_y + ANCHOR_OFFSET[d_anchor][1] * e_bounds.height];
        });
    };
    
    d3.selection.prototype.setGlobalBBox = function (x, y, width, height) {
        var self = this;
        return self.setGlobalTransform(function (d, i, e_bounds) {
            var d_x = typeof x === 'function' ? x.call(this, d, i) : x,
                d_y = typeof y === 'function' ? y.call(this, d, i) : y,
                d_width = typeof width === 'function' ? width.call(this, d, i) : width,
                d_height = typeof height === 'function' ? height.call(this, d, i) : height,
                scale_x = d_width / e_bounds.width,
                scale_y = d_height / e_bounds.height;
            
            return [scale_x, 0, 0, scale_y, d_x + d_width/2, d_y + d_height/2];
        });
    };
    
    d3.selection.prototype.setGlobalTransform = function (m) {
        var self = this;
        return self.each(function (d, i) {
            var e = this,
                e_bounds = e.getBoundingClientRect(),
                toGlobalZeroM = [1,0,0,1,-(e_bounds.left + e_bounds.width/2),-(e_bounds.top + e_bounds.width/2)],
                currentM = e.getAttribute('transform'),
                d_m = typeof m === 'function' ? m.call(this, d, i, e_bounds) : m,
                stringMode,
                params;
            
            if (currentM && currentM !== "null") {
                currentM = currentM.split('(');
                stringMode = currentM[0].trim().toLowerCase();
                params = currentM[1].substring(0, currentM[1].length - 1).split(',');
                            
                if (stringMode === 'translate') {
                    currentM = [1,0,0,1,Number(params[0]),Number(params[1])];
                } else if (stringMode === 'matrix') {
                    currentM = params;
                } else if (stringMode === 'rotate') {
                    currentM = [Math.cos(params[0]),
                                Math.sin(params[0]),
                                -Math.sin(params[0]),
                                Math.cos(params[0]),
                                0,
                                0];
                } else {
                    throw new Error('Hanpuku Error: ' + stringMode + ' transforms are not yet supported.');
                }
            } else {
                currentM = [1,0,0,1,0,0];
            }
            // Given its current transform matrix, translate the object so it's centered at 0,0
            currentM = matMultiply(toGlobalZeroM, currentM);
            // Now apply d_m
            currentM = matMultiply(d_m, currentM);
            
            e.setAttribute('transform', 'matrix(' + currentM.join(',') + ')');
        });
    };
})();