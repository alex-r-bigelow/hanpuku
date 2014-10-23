/*jslint evil:true*/
var CSLibrary = new CSInterface(),
    loadedJSXlibs= false,
    docIsActive = false,
    $data,
    selectedIDs = [],
    pathSplitter = new RegExp('[MmZzLlHhVvCcSsQqTtAa]', 'g');

/* General purpose functions */
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
    // Inverse of SVG matrix (per WolframAlpha, because I'm lazy)
    
    // d/(ad-bc)    c/(bc-ad)   (de-cf)/(bc-ad)
    // b/(bc-ad)    a/(ad-bc)   (be-af)/(ad-bc)
    //     0            0              1
    
    var adbc = m[0]*m[3]-m[1]*m[2],
        bcad = -adbc;
    return [
        m[3]/adbc,
        m[1]/bcad,
        m[2]/bcad,
        m[0]/adbc,
        (m[3]*m[4] - m[2]*m[5])/bcad,
        (m[1]*m[5] - m[0]*m[4])/adbc
    ];
}

function matPoint(m, x, y) {
    return [
        m[0]*x + m[2]*y + m[4],
        m[1]*x + m[3]*y + m[5]
    ];
}

/* Helper functions for converting circles, rectangles, and paths
 * to cubic-interpolated paths */
function pathToCubicPath(d, m) {
    var pointTypes = d.match(pathSplitter),
        coordList = d.split(pathSplitter).splice(1),
        coords,
        temp,
        lastAnchor;
    
    if (m === undefined) {
        m = [1,0,0,1,0,0];
    }
    
    d = "";
    
    // First convert H and V to L
    for (i = 0; i < pointTypes.length; i += 1) {
        if (pointTypes[i] === 'H') {
            pointTypes[i] = 'L';
            temp = coordList[i-1].split(',');
            coordList[i] = coordList[i] + ',' + temp[temp.length - 1];
        } else if (pointTypes[i] === 'V') {
            pointTypes[i] = 'L';
            temp = coordList[i-1].split(',');
            coordList[i] = temp[temp.length - 2] + ',' + coordList[i];
        }
    }
    
    function parsePairList(list) {
        list = list.split(',');
        var result = [],
            j;
        for (j = 0; j < list.length; j += 2) {
            result.push(matPoint(m, list[j], list[j + 1]).join(','));
        }
        return result;
    }
    
    for (i = 0; i < pointTypes.length; i += 1) {
        if (pointTypes[i].toUpperCase() !== pointTypes[i]) {
            throw 'no support for relative point ' + pointTypes[i] + ' yet';
        }
        
        if (i === 0) {
            if (pointTypes[i] === 'M') {
                coords = parsePairList(coordList[i]);
                d += "M" + coords[0];
            } else {
                throw 'paths must start with M';
            }
        } else if (pointTypes[i] === 'C') {
            coords = parsePairList(coordList[i]);
            d += "C" + coords.join(',');
        } else if (pointTypes[i] === 'Z') {
            d += "Z";
        } else if (pointTypes[i] === 'L') {
            temp = parsePairList(coordList[i-1]);
            lastAnchor = temp[temp.length - 1];
            coords = parsePairList(coordList[i]);
            d += "C" + lastAnchor + ',' +
                       coords[0] + ',' +
                       coords[0];
        } else if (pointTypes[i] === 'Q') {
            coords = parsePairList(coordList[i]);
            d += "C" + coords[0] + ',' +
                       coords[0] + ',' +
                       coords[1];
        } else {
            throw 'no support yet for path point ' + pointTypes[i];
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
        "C" + (cx + r / 2) + "," + (cy - r) + "," +
              (cx + r) + "," + (cy - r / 2) + "," +
              (cx + r) + "," + cy +    // right
        "C" + (cx + r) + "," + (cy + r / 2) + "," +
              (cx + r / 2) + "," + (cy + r) + "," +
              cx + "," + (cy + r) +    // bottom
        "C" + (cx - r / 2) + "," + (cy + r) + "," +
              (cx - r) + "," + (cy + r / 2) + "," +
              (cx - r) + "," + cy +    // left
        "C" + (cx - r) + "," + (cy - r / 2) + "," +
              (cx - r / 2) + "," + (cy - r) + "," +
              cx + "," + (cy - r) +    // top
        "Z",
    m);
}

/* Monkey patch .appendClone(), .appendCircle(), .appendRect(),
   .appendPath() to d3.selection and d3.selection.enter,
   as well as .keyFunction() to d3.selection */
/* These are important to allow d3 to work with a DOM that has
   gone through Illustrator; Illustrator applies all transforms
   immediately instead of as an attribute, and every shape is
   a cubic-interpolated path. These monkey-patched functions
   apply transforms behind the scenes and convert shapes to
   cubic-interpolated paths */


d3.selection.prototype.appendClone = function (idToClone) {
    var self = this,
        proto = document.getElementById(idToClone),
        clone = self.append(proto.tagName);
    
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
    
    constructClone(proto, clone);
    
    return clone;
};
d3.selection.enter.prototype.appendClone = d3.selection.prototype.appendClone;

d3.selection.prototype.appendCircle = function (cx, cy, r) {
    var self = this;
    return self.append('path')
        .attr('d', function (i) {
            var d_cx = typeof cx === 'function' ? cx(i) : cx,
                d_cy = typeof cy === 'function' ? cy(i) : cy,
                d_r = typeof r === 'function' ? r(i) : r;
            return circleToCubicPath(d_cx, d_cy, d_r);
        });
};
d3.selection.enter.prototype.appendCircle = d3.selection.prototype.appendCircle;

d3.selection.prototype.appendRect = function (x, y, width, height) {
    var self = this;
    return self.append('path')
        .attr('d', function (i) {
            var d_x = typeof x === 'function' ? x(i) : x,
                d_y = typeof y === 'function' ? y(i) : y,
                d_width = typeof width === 'function' ? width(i) : width,
                d_height = typeof height === 'function' ? height(i) : height;
            return rectToCubicPath(d_x, d_y, d_width, d_height);
        });
};
d3.selection.enter.prototype.appendRect = d3.selection.prototype.appendRect;

d3.selection.prototype.appendPath = function (d) {
    var self = this;
    return self.append('path')
        .attr('d', function (i) {
            var d_d = typeof d === 'function' ? d(i) : d;
            return pathToCubicPath(d_d);
        });
};
d3.selection.enter.prototype.appendPath = d3.selection.prototype.appendPath;

//d3.selection.prototype._nativeDataFunction = d3.selection.prototype.data;

/*d3.selection.prototype.keyFunction = function (keyFunction) {
    var self = this;
    self.each(function (e) {
        this.setAttribute('id3_keyFunction', String(keyFunction));
    });
    return self;
}*/
/*d3.selection.prototype.iter_d3 = function (callback) {
    // Iterates d3 selections of elements
    this.each(function (e) {
        if (e.getAttribute('id') === null) {
            throw 'iter_d3 requires that all children have ids';
        }
        e = d3.select('#' + e.getAttribute('id'));
        callback(e);
    });
};*/

/* Tools to interact with extendScript */
function loadJSXlibs() {
    var jsxLibs = ['lib/json2.js'],
        i = 0,
        successFunction = function (script) {
            CSLibrary.evalScript(script, function (r) {
                // evalScript is asynchronous, so we have to loop
                // this way to make sure everything is loaded
                // before we run stuff
                if (r.isOk === false) {
                    console.warn(r);
                    throw "Error Loading JSX";
                }
                i += 1;
                if (i < jsxLibs.length) {
                    jQuery.ajax({
                        url: jsxLibs[i],
                        success: successFunction
                    });
                } else {
                    loadedJSXlibs = true;
                }
            });
        };
    jQuery.ajax({
        url: jsxLibs[i],
        success: successFunction
    });
}

function runJSX(input, path, callback) {
    if (loadedJSXlibs === false) {
        window.setTimeout(function () { runJSX(input, path, callback); }, 1000);
    } else {
        jQuery.ajax({
            url: path,
            success: function (script) {
                script = "var input=" + JSON.stringify(input) + ";\n" + script;
                CSLibrary.evalScript(script, function (r) {
                    var result;
                    if (r.search("Error") === 0 || r.isOk === false) {
                        throw r;
                    } else {
                        try {
                            result = JSON.parse(r);
                        } catch (e) {
                            console.warn("Couldn't parse:\n" + r);
                            throw e;
                        }
                    }
                    callback(result);
                });
            },
            cache: false
        });
    }
}

/* Function for debugging the extension in Illustrator */
function reload() {
    location.reload();
}

/* Attempt to fit in with Illustrator's current UI settings*/
function styleWidget() {
    var i = CSLibrary.getHostEnvironment().appSkinInfo,
        panelColor = i.panelBackgroundColor.color,
        panelStyle = 'background-color:rgba(' + Math.floor(panelColor.red) + ',' +
                                                Math.floor(panelColor.green) + ',' +
                                                Math.floor(panelColor.blue) + ',' +
                                                0.9*(panelColor.alpha/255.0) + ');',
        buttonStyle = 'background-color:rgba(' + Math.floor(panelColor.red) + ',' +
                                                Math.floor(panelColor.green) + ',' +
                                                Math.floor(panelColor.blue) + ',' +
                                                0.5*(panelColor.alpha/255.0) + ');';
    jQuery('body').attr('style', panelStyle);
    jQuery('button, select').attr('style', buttonStyle);
}

/* DOM Preview helper functions */
function zoomIn() {
    var current = getCSSRule('div#dom svg');
    current.style.zoom = (current.style.zoom.slice(0,-1) * 2) + "%";
    jQuery('#zoomButtons span').text(current.style.zoom);
}
function zoomOut() {
    var current = getCSSRule('div#dom svg'),
        newZoom = current.style.zoom.slice(0,-1) / 2;
    if (newZoom < 17.5) {
        newZoom = 17.5;
    }
    current.style.zoom = newZoom + "%";
    jQuery('#zoomButtons span').text(current.style.zoom);
}

function clearDOM() {
    document.getElementById('dom').innerHTML = "";
    jQuery('div button, textarea, input, select')
        .attr('disabled', true);
    jQuery('#debugButton button').attr('disabled', false);
}

/* Code helper functions */
function updateCSS() {
    jQuery('#userCSS').remove();
    var style = document.createElement('style');
    style.setAttribute('id','userCSS');
    style.appendChild(document.createTextNode(jQuery('#cssEditor').val()));
    document.head.appendChild(style);
}

function loadCSS(path) {
    jQuery.ajax({
        url: path,
        success: function (contents) {
            jQuery('#cssEditor').val(contents);
            updateCSS();
        },
        error: function () {
            jQuery('#jsEditor').val("");
            updateCSS();
        },
        cache: false,
        async: false
    });
}

function updateData() {
    var ext = jQuery('#dataTypeSelect').val(),
        dataText = jQuery('#dataEditor').val();
    
    if (ext === 'js') {
        $data = eval(dataText);
    } else if (ext === 'json') {
        $data = JSON.parse(dataText);
    } else if (ext === 'csv') {
        $data = d3.csv.parse(dataText);
    } else if (ext === 'tsv') {
        $data = d3.tsv.parse(dataText);
    }
}

function loadData(path) {
    var ext = path.split('.');
    ext = ext[ext.length-1];
    
    jQuery.ajax({
        url: path,
        success: function (contents) {
            jQuery('#dataEditor').val(contents);
            jQuery('#dataTypeSelect').val(ext);
        },
        error: function () {
            jQuery('#dataEditor').val("");
        },
        cache: false,
        async: false
    });
}

function runJS() {
    eval(jQuery('#jsEditor').val());
}

function loadJS(path) {
    jQuery.ajax({
        url: path,
        success: function (contents) {
            contents = "var doc = d3.select(\"#" +
                        jQuery('#dom svg').attr('id') +
                        "\");\n" + contents;
            jQuery('#jsEditor').val(contents);
        },
        error: function () {
            jQuery('#jsEditor').val("");
        },
        cache: false,
        async: false
    });
}

function runCode() {
    updateData();
    runJS();
    renderSelection();
}

function loadSample() {
    var v = jQuery('#sampleMenu').val().split(',');
    
    if (docIsActive === false) {
        return;
    }
    if (v !== 'header') {
        if (v[0].length > 0) {
            loadCSS('examples/' + v[0]);
        }
        if (v[1].length > 0) {
            loadJS('examples/' + v[1]);
        }
        if (v[2].length > 0) {
            loadData('examples/' + v[2]);
        }
        jQuery('#sampleMenu').val('header');
    }
}

function renderSelection() {
    document.getElementById('selectionManipulator').innerHTML = "";
    
    var table = d3.select('#selectionManipulator').append('table'),
        thead = table.append('thead').append('tr'),
        tbody = table.append('tbody');
    
    table.attr('cellspacing','0');
    
    thead.append('td').text('Selected Object IDs');
    thead.append('td').text('Bound Data');
    
    var tr = tbody.selectAll('tr').data(selectedIDs).enter().append('tr');
    
    tr.append('td').text(function (d) { return d; });
    tr.append('td').text(function (d) {
        var data = d3.select('#' + d).datum();
        if (data) {
            return JSON.stringify(data);
        } else {
            return "(no data)";
        }
    });
    
    var selectionRects = d3.select('#dom svg').selectAll('path.selection').data(selectedIDs);
    selectionRects.enter().append('path').attr('class','selection');
    selectionRects.exit().remove();
    var svgBounds = jQuery('#dom svg')[0].getBoundingClientRect();
    selectionRects.attr('d', function (d) {
        var bounds = document.getElementById(d).getBoundingClientRect();
        // I don't use getBBox() because we might be overlaying something inside a group
        // and the overlay paths need to be at the root level so we can add/remove them
        // easily. That said, we need to account for the padding on the svg element in
        // the preview
        return "M" + (bounds.left - svgBounds.left) + "," + (bounds.top - svgBounds.top) +
               "L" + (bounds.right - svgBounds.left) + "," + (bounds.top - svgBounds.top) +
               "L" + (bounds.right - svgBounds.left) + "," + (bounds.bottom - svgBounds.top) +
               "L" + (bounds.left - svgBounds.left) + "," + (bounds.bottom - svgBounds.top) +
               "Z";
    });
}

function updateSelection() {
    runJSX(null, 'scripts/getSelection.jsx', function (result) {
        selectedIDs = result;
        renderSelection();
    })
}

function setupTabs() {
    var startingTab = 'codePanel';
    jQuery('body > div').hide();
    jQuery('#widgetControls').show();
    jQuery('#' + startingTab).show();
    jQuery('#' + startingTab + 'Button').attr('class', 'active');
}

function switchTab(tabId) {
    var oldTab = jQuery('#tabControls button.active').attr('id');
    oldTab = oldTab.substring(0,oldTab.length-6);
    jQuery('#' + oldTab).hide();
    jQuery('#' + tabId).show();
    
    jQuery('#' + oldTab + "Button").attr('class', null);
    jQuery('#' + tabId + "Button").attr('class', 'active');
}

/* Where execution begins when the extension is loaded */
function main() {
    setupTabs();
    styleWidget();
    loadJSXlibs();
    docToDom();
    //window.onfocus = updateSelection;
    CSLibrary.addEventListener('documentAfterActivate', docToDom);
    CSLibrary.addEventListener('documentAfterDeactivate', docToDom);
    // TODO: fire docToDom on documentAfterActivate (and documentAfterDeactivate?)
}