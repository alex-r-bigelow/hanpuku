/*jslint evil:true*/
var CSLibrary = new CSInterface(),
    loadedJSXlibs= false,
    docIsActive = false,
    $data,
    sampleDataFiles = {
        scatterplot : 'data.tsv'    // *********** START HERE: modify scatterplot to use clones, fix other samples
    };

/* Monkey patch appendClone to d3.selection */
d3.selection.prototype.appendClone = function (idToClone) {
    var e = document.getElementById(idToClone),
        newElement,
        aIndex,
        copyId,
        copyNumber = 1;
    if (e === null) {
        throw "No element of ID " + idToClone + " exists.";
    }
    newElement = document.createElement(e.tagName);
    for (aIndex in e.attributes) {
        if (e.attributes.hasOwnProperty(aIndex) && aIndex !== 'length') {
            a = e.attributes[a];
            if (a === 'id') {
                copyId = newElement.getAttribute(a) + " copy " + copyNumber;
                while (document.getElementById(copyId) !== null) {
                    copyNumber += 1;
                    copyId = newElement.getAttribute(a) + " copy " + copyNumber;
                }
                newElement.setAttribute('id', copyId);
            } else {
                newElement.setAttribute(a, e.getAttribute(a));
            }
        }
    }
    return d3.select('#' + newElement.getAttribute('id'));
};

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
                    console.log(r);
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
                script = "var input=\"" + JSON.stringify(input) + "\"\n" + script;
                CSLibrary.evalScript(script, function (r) {
                    var result;
                    if (r.search("Error") === 0 || r.isOk === false) {
                        console.warn(r);
                        result = null;
                    } else {
                        result = JSON.parse(r);
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
}

function extractPathString(path) {
    var p,
        point = path.points[0],
        nextPoint,
        d = "M" + point.anchor[0] + "," + point.anchor[1];
    
    for (p = 0; p < path.points.length; p += 1) {
        point = path.points[p];
        if (p === path.points.length - 1) {
            if (path.closed !== true) {
                break;
            }
            nextPoint = path.points[0];
        } else {
            nextPoint = path.points[p + 1];
        }
        
        d += "C" + point.rightDirection[0] + "," + point.rightDirection[1] + "," +
                   nextPoint.leftDirection[0] + "," + nextPoint.leftDirection[1] + "," +
                   nextPoint.anchor[0] + "," + nextPoint.anchor[1];
    }
    if (path.closed === true) {
        d += "Z";
    }
    return d;
}

function addPath (parent, path) {
    parent.append('path')
        .attr('id', path.name)
        .attr('d', extractPathString(path))
        .style('fill', path.fill)
        .style('stroke', path.stroke)
        .style('opacity', path.opacity);
}

function addChildGroups (parent, group) {
    var g,
        newGroup,
        p;
    group.groups = group.groups.sort(phrogz('zIndex'));
    for (g = 0; g < group.groups.length; g += 1) {
        newGroup = parent.append('g')
            .attr('id', group.groups[g].name);
        addChildGroups(newGroup, group.groups[g]);
    }
    group.paths = group.paths.sort(phrogz('zIndex'));
    for (p = 0; p < group.paths.length; p += 1) {
        addPath(parent, group.paths[p]);
    }
}

/* Copies the current Illustrator document to the DOM Preview */
function docToDom () {
    runJSX(null, 'scripts/docToDom.jsx', function (result) {
        if (result === null) {
            docIsActive = false;
            clearDOM();
        } else {
            docIsActive = true;
            
            // Set up the document and the GUI
            document.getElementById('dom').innerHTML = "";  // nuke the svg so we start fresh
            var svg = d3.select('#dom')
                .append('svg')
                .attr('width', result.width)
                .attr('height', result.height)
                .attr('id', result.name);
            jQuery('div button, textarea, input, select')
                .attr('disabled', false);
            
            // Add the artboards
            var artboards = svg.selectAll('.artboard').data(result.artboards);
            artboards.enter().append('rect')
                .attr('class','artboard')
                .attr('id',phrogz('name'))
                .attr('x',function (d) { return d.rect[0]; })
                .attr('y',function (d) { return d.rect[1]; })
                .attr('width',function (d) { return d.rect[2] - d.rect[0]; })
                .attr('height',function (d) { return d.rect[3] - d.rect[1]; });
            
            // Add the layers (really just groups)
            var g, newLayer;
            result.groups = result.groups.sort(phrogz('zIndex'));
            for (g = 0; g < result.groups.length; g += 1) {
                newLayer = svg.append('g')
                    .attr('id', result.groups[g].name);
                addChildGroups(newLayer, result.groups[g]);
            }
            
            // If the code areas are empty, fill them with some defaults
            // to give people an idea of what they can / should do
            if (jQuery('#dataEditor').val() === "") {
                jQuery('#dataEditor').val('$data = {};');
            }
            if (jQuery('#jsEditor').val() === "") {
                jQuery('#jsEditor').val('var doc = d3.select("#' + result.name + '"),\n' +
                                        '    artboards = d3.selectAll(".artboard");');
            }
        }
    });
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
                        "\"),\n" + contents;
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
}

function loadSample() {
    var v = jQuery('#sampleMenu').val();
    
    if (docIsActive === false) {
        return;
    }
    if (v !== 'header') {
        loadCSS('examples/' + v + '/style.css');
        loadData('examples/' + v + '/' + sampleDataFiles[v]);
        loadJS('examples/' + v + '/script.js');
        jQuery('#sampleMenu').val('header');
    }
}

/* Where execution begins when the extension is loaded */
function main() {
    styleWidget();
    docToDom();
    // TODO: fire docToDom on documentAfterActivate (and documentAfterDeactivate?)
    loadJSXlibs();
}