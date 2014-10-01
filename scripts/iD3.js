/*jslint evil:true*/
var CSLibrary = new CSInterface(),
    loadedJSXlibs= false,
    docIsActive = false,
    $data,
    sampleDataFiles = {
        buildAGraph : null,
        force : 'data.json',
        groupedBarChart : 'data.csv',
        lineChart : 'data.tsv',
        scatterClones : 'data.tsv',
        scatterplot : 'data.tsv'    // TODO: fix other samples
    };

/* Monkey patch appendClone to d3.selection and d3.selection.enter */
var copyNumber = 1;

function constructClone (proto, clone) {
    var a,
        attrib,
        c,
        child,
        copyId;
    
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

d3.selection.prototype.appendClone = function (idToClone) {
    var self = this,
        proto = document.getElementById(idToClone),
        clone = self.append(proto.tagName);
    
    constructClone(proto, clone);
    
    return clone;
};
d3.selection.enter.prototype.appendClone = d3.selection.prototype.appendClone;

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
                script = "var input='" + JSON.stringify(input) + "';\n" + script;
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
        if (sampleDataFiles[v] !== null) {
            loadData('examples/' + v + '/' + sampleDataFiles[v]);
        }
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