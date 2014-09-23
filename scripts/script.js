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
        color = i.panelBackgroundColor.color,
        style = 'background-color:rgba(' + Math.floor(color.red) + ',' + Math.floor(color.green) + ',' + Math.floor(color.blue) + ',' + (color.alpha/255.0) + ');' +
                'font-family:"' + i.baseFontFamily + '";font-size:' + i.baseFontSize + 'pt;';
    jQuery('body').attr('style', style);
}

function run() {
    runJSX(null, 'scripts/illustratorToDOM.jsx', function (result) {
        console.log(result);
    });
}

function clearDOM() {
    jQuery('#dom svg')
        .attr('width','0')
        .attr('height','0')
        .attr('id','filename');
    jQuery('#controls button')
        .attr('disabled', true);
    jQuery('#domToDoc')
        .text('Update (no doc)');
}

function docToDom () {
    runJSX(null, 'scripts/docToDom.jsx', function (result) {
        if (result === null) {
            clearDOM();
        } else {
            jQuery('#dom svg')
                .attr('width', result.width)
                .attr('height', result.height)
                .attr('id', result.name);
            jQuery('#controls button')
                .attr('disabled', false);
            jQuery('#domToDoc')
                .text('Update ' + result.name);
        }
    });
}

function main() {
    styleWidget();
    docToDom();
    // TODO: fire docToDom on documentAfterActivate (and documentAfterDeactivate?)
    loadJSXlibs();
}