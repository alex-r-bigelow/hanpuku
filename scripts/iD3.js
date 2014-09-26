/*jslint evil:true*/
var CSLibrary = new CSInterface(),
    loadedJSXlibs= false,
    docIsActive = false,
    $data,
    exampleFiles = {
        data : 'data.js',
        css : 'style.css',
        js : 'script.js'
    };

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

function reload() {
    location.reload();
}

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
    /*    barColor = i.appBarBackgroundColor.color,
          editorStyle = 'background-color:rgba(' + Math.floor(barColor.red) + ',' +
                                                 Math.floor(barColor.green) + ',' +
                                                 Math.floor(barColor.blue) + ',' +
                                                 (barColor.alpha/255.0) + ');' +
                      'font-size:' + i.baseFontSize + 'pt;';*/
    jQuery('body').attr('style', panelStyle);
    jQuery('button, select').attr('style', buttonStyle);
    //jQuery('#code span').attr('style', editorStyle);
    //jQuery('textarea').attr('style', editorStyle);
}

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

function run() {
    runJSX(null, 'scripts/illustratorToDOM.jsx', function (result) {
        console.log(result);
    });
}

function clearDOM() {
    document.getElementById('dom').innerHTML = "";
    jQuery('#docControls div button, #domControls div button, textarea, input, select')
        .attr('disabled', true);
}

function docToDom () {
    runJSX(null, 'scripts/docToDom.jsx', function (result) {
        if (result === null) {
            docIsActive = false;
            clearDOM();
        } else {
            docIsActive = true;
            
            // Set up the document and the GUI
            document.getElementById('dom').innerHTML = "";  // nuke the svg so we start fresh
            d3.select('#dom')
                .append('svg')
                .attr('width', result.width)
                .attr('height', result.height)
                .attr('id', result.name);
            jQuery('#docControls div button, #domControls div button, textarea, input, select')
                .attr('disabled', false);
            
            // Add the paths
            var svg = d3.select('#' + result.name);
            
            var items = svg.selectAll('path')
                            .data(result.items);
                        
            var item = items.enter().append('path');
            item.attr('d',f('d'))
                .attr('id',f('name'))
                .attr('fill',f('fill'))    // TODO: show a warning if there are CMYK colors
                .attr('fill-opacity',f('opacity'))
                .attr('stroke',f('stroke'))
                .attr('stroke-opacity',f('opacity'));
            
            // If the code areas are empty, fill them with some defaults
            // to give people an idea of what they can / should do
            if (jQuery('#dataEditor').val() === "") {
                jQuery('#dataEditor').val('$data = {};');
            }
            if (jQuery('#jsEditor').val() === "") {
                jQuery('#jsEditor').val('var svg = d3.select("#' + result.name + '");');
            }
        }
    });
}

function updateCSS() {
    jQuery('#userCSS').remove();
    var style = document.createElement('style');
    style.setAttribute('id','userCSS');
    style.appendChild(document.createTextNode(jQuery('#cssEditor').val()));
    document.head.appendChild(style);
}

function updateData() {
    $data = eval(jQuery('#dataEditor').val());
}

function runJS() {
    eval(jQuery('#jsEditor').val());
}

function runCode() {
    updateData();
    runJS();
}

function loadSample() {
    var v = jQuery('#sampleMenu').val(),
        t;
    if (docIsActive === false) {
        return;
    }
    if (v !== 'header') {
        for (t in exampleFiles) {
            if (exampleFiles.hasOwnProperty(t)) {
                jQuery.ajax({
                    url: 'examples/' + v + '/' + exampleFiles[t],
                    success: function (contents) {
                        if (t === 'js') {
                            contents = "var svg = d3.select(\"#" +
                                        jQuery('#dom svg').attr('id') +
                                        "\"),\n" + contents;
                        }
                        jQuery('#' + t + "Editor").val(contents);
                    },
                    error: function () {
                        jQuery('#' + t + "Editor").val("");
                    },
                    cache: false,
                    async: false
                });
            }
        }
        jQuery('#sampleMenu').val('header');
        updateCSS();
    }
}

function main() {
    styleWidget();
    docToDom();
    // TODO: fire docToDom on documentAfterActivate (and documentAfterDeactivate?)
    loadJSXlibs();
}