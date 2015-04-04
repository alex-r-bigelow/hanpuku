/*globals window, console, document, CSInterface, jQuery, d3*/
window.scriptLoader.require(['../../lib/CSInterface.js',
                             '../../lib/jquery-1.11.0.min.js',
                             '../../lib/d3.min.js'], function () {
    "use strict";
    
    function IllustratorConnection() {
        var self = this;
        
        self.connection = new CSInterface();
        self.UI = {};
        // Load the libraries that JSX scripts need
        self.loadedJSXlibs = false;
        self.loadJSXlibs();

        self.selectedIDs = [];
    }
    IllustratorConnection.JSX_LIBS = [
        '../../lib/json2.js',
        '../../lib/jsxShims.js'
    ];
    /* Tools to interact with extendScript */
    IllustratorConnection.prototype.loadJSXlibs = function () {
        var self = this,
            i = 0,
            successFunction = function (script) {
                self.connection.evalScript(script, function (r) {
                    // evalScript is asynchronous, so we have to loop
                    // this way to make sure everything is loaded
                    // before we run stuff
                    if (r.isOk === false) {
                        throw "Error Loading JSX";
                    }
                    i += 1;
                    if (i < IllustratorConnection.JSX_LIBS.length) {
                        jQuery.ajax({
                            url: IllustratorConnection.JSX_LIBS[i],
                            success: successFunction
                        });
                    } else {
                        self.loadedJSXlibs = true;
                    }
                });
            };
        jQuery.ajax({
            url: IllustratorConnection.JSX_LIBS[i],
            success: successFunction,
            cache: false
        });
    };
    IllustratorConnection.prototype.runJSX = function (input, path, callback, errorFunction) {
        var self = this,
            i,
            s;
        if (self.loadedJSXlibs === false) {
            // Try again in a second...
            window.setTimeout(function () { self.runJSX(input, path, callback, errorFunction); }, 1000);
        } else {
            jQuery.ajax({
                url: path,
                success: function (script) {
                    script = "var input=" + JSON.stringify(input) + ";\n" + script;
                    self.connection.evalScript(script, function (r) {
                        var result;
                        if (r.isOk === false) {
                            console.warn("Unknown JSX Error");
                            throw r;
                        } else {
                            try {
                                result = JSON.parse(r);
                            } catch (e) {
                                console.warn("Couldn't parse JSX result in " + path + ":\n" + r);
                                throw e;
                            }
                            for (i = 0; i < result.logs.length; i += 1) {
                                console.log(result.logs[i]);
                            }
                            if (result.error !== null) {
                                if (errorFunction) {
                                    i = new Error(result.error.message + '\n    (' + path + ':' + result.error.line + ')', path, result.error.line);
                                    errorFunction(i);
                                } else {
                                    throw "JSX Error in " + path + " on line " + result.error.line + ": " + result.error.message;
                                }
                            }
                        }
                        callback(result.output);
                    });
                },
                cache: false
            });
        }
    };
    IllustratorConnection.prototype.openBrowser = function (url) {
        var self = this;
        self.connection.openURLInDefaultBrowser(url);
    };
    IllustratorConnection.prototype.onFileChange = function (updateFunc) {
        var self = this;
        //window.onfocus = updateFunc;
        // TODO: when Illustrator adds more listeners, inject them here!
        self.connection.addEventListener('documentAfterActivate', updateFunc);
        self.connection.addEventListener('documentAfterDeactivate', updateFunc);
    };
    IllustratorConnection.prototype.updateSelection = function (d3selection) {
        var self = this;
        self.selectedIDs = [];
        if (d3selection instanceof d3.selection) {
            d3selection.each(function () {
                if (this.parentNode !== null) {
                    self.selectedIDs.push(this.getAttribute('id'));
                }
            });
        }
    };
    IllustratorConnection.prototype.applyUI = function () {
        // Get Illustrator's UI settings
        var self = this,
            i = self.connection.getHostEnvironment().appSkinInfo,
            background = i.panelBackgroundColor.color,
            useWhite = (background.red + background.green + background.blue) / (3 * 255.0) <= 0.5,
            p,
            panel,
            v,
            view;
        
        self.UI.textColor = useWhite ? '#dadada' : '#000';
        self.UI.oppositeTextColor = useWhite ? '#000' : '#dadada';
        self.UI.fontFamily = i.baseFontFamily;
        self.UI.fontSize = i.baseFontSize;
        self.UI.largeFontSize = self.fontSize + 2;
        
        self.UI.backgroundColor = 'rgba(' + Math.floor(background.red) + ',' +
                                            Math.floor(background.green) + ',' +
                                            Math.floor(background.blue) + ',' +
                                            (background.alpha / 255.0) + ')';
        self.UI.haloColor = 'rgba(' + (255 - Math.floor(background.red)) + ',' +
                                      (255 - Math.floor(background.green)) + ',' +
                                      (255 - Math.floor(background.blue)) + ',' +
                                      (background.alpha / 255.0) + ')';
        self.UI.buttonColor = 'rgba(' + Math.floor(background.red) + ',' +
                                        Math.floor(background.green) + ',' +
                                        Math.floor(background.blue) + ',' +
                                        0.25 * (background.alpha / 255.0) + ')';
        
        // Apply the font and colors
        jQuery('body').css('font-family', self.UI.fontFamily)
                       .css('font-size', self.UI.fontSize)
                       .css('background-color', self.UI.backgroundColor)
                       .css('color', self.UI.textColor);
        
        jQuery('.halo').css('background-color', self.UI.haloColor)
                       .css('color', self.UI.oppositeTextColor);
        jQuery('button, select').css('background-color', self.UI.buttonColor);
        jQuery('textarea').css('background-color', self.UI.textBackgroundColor)
                          .css('color', self.UI.textColor)
                          .css('font-size', self.UI.largeFontSize);
        jQuery('#dataPreview').css('background-color', self.UI.bodyColor);
    };
    
    window.illustrator = new IllustratorConnection();
});