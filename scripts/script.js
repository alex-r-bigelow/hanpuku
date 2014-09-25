var CSLibrary = new CSInterface(),
    loadedJSXlibs= false;

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
                                                (panelColor.alpha/255.0) + ');' +
                     'font-family:"' + i.baseFontFamily + '";' +
                     'font-size:' + i.baseFontSize + 'pt;';
    /*    barColor = i.appBarBackgroundColor.color,
          editorStyle = 'background-color:rgba(' + Math.floor(barColor.red) + ',' +
                                                 Math.floor(barColor.green) + ',' +
                                                 Math.floor(barColor.blue) + ',' +
                                                 (barColor.alpha/255.0) + ');' +
                      'font-size:' + i.baseFontSize + 'pt;';*/
    jQuery('body').attr('style', panelStyle);
    //jQuery('#code span').attr('style', editorStyle);
    //jQuery('textarea').attr('style', editorStyle);
}

function run() {
    runJSX(null, 'scripts/illustratorToDOM.jsx', function (result) {
        console.log(result);
    });
}

function clearDOM() {
    document.getElementById('dom').innerHTML = "";
    jQuery('#docControls div button, #domControls div button, textarea, input')
        .attr('disabled', true);
}

function docToDom () {
    runJSX(null, 'scripts/docToDom.jsx', function (result) {
        if (result === null) {
            clearDOM();
        } else {
            // Set up the document and the GUI
            document.getElementById('dom').innerHTML = "";  // nuke the svg so we start fresh
            d3.select('#dom')
                .append('svg')
                .attr('width', result.width)
                .attr('height', result.height)
                .attr('id', result.name);
            jQuery('#docControls div button, #domControls div button, textarea, input')
                .attr('disabled', false);
            
            // Add the paths
            var svg = d3.select('#' + result.name);
            
            var items = svg.selectAll('path')
                            .data(result.items);
                        
            var item = items.enter().append('path');
            item.attr('d',phrogz('d'))
                .attr('id',phrogz('name'))
                .attr('fill',phrogz('fill'))    // TODO: show a warning if there are CMYK colors
                .attr('fill-opacity',phrogz('opacity'))
                .attr('stroke',phrogz('stroke'))
                .attr('stroke-opacity',phrogz('opacity'));
        }
    });
}

function domToDoc () {
    
}

function main() {
    styleWidget();
    docToDom();
    // TODO: fire docToDom on documentAfterActivate (and documentAfterDeactivate?)
    loadJSXlibs();
}