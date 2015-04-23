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
        self.aceEditors = [];
    }
    IllustratorConnection.JSX_LIBS = [
        '../../lib/json2.js',
        '../../lib/jsxShims.js',
        '../../common/fileManager.jsx'
    ];
    /* Tools to interact with extendScript */
    IllustratorConnection.prototype.loadJSXlibs = function (cache) {
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
                            success: successFunction,
                            cache: false
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
    IllustratorConnection.prototype.runJSX = function (input, path, callback, errorFunction, cache) {
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
                        callback(self.handleJsxResult(r, path, errorFunction));
                    });
                },
                cache: false
            });
        }
    };
    IllustratorConnection.prototype.handleJsxResult = function (r, command, errorFunction) {
        var self = this,
            result,
            i;
        if (r.isOk === false) {
            console.warn("Unknown JSX Error");
            throw r;
        } else {
            try {
                result = JSON.parse(r);
            } catch (e) {
                console.warn("Couldn't parse JSX result:\n" + r);
                throw e;
            }
            for (i = 0; i < result.logs.length; i += 1) {
                console.log(result.logs[i]);
            }
            if (result.error !== null) {
                i = new Error("JSX Error on line " + (Number(result.error.line) + 1) + " when calling " + command + ": " + result.error.message,
                              command, result.error.line + 1);
                if (errorFunction) {
                    errorFunction(i);
                } else {
                    throw i;
                }
            }
            return result.output;
        }
    };
    IllustratorConnection.prototype.callFunction = function (funcName, parameters, callback) {
        var self = this,
            i,
            result;
        parameters = parameters === undefined ? [] : parameters;
        for (i = 0; i < parameters.length; i += 1) {
            parameters[i] = JSON.stringify(parameters[i]);
        }
        parameters.splice(0, 0, funcName);
        parameters = JSON.stringify(parameters);
        parameters = parameters.slice(1, -1);
        self.connection.evalScript('runJsxFunction(' + parameters + ');', function (r) {
            result = self.handleJsxResult(r, funcName);
            if (callback) {
                callback(result);
            }
        });
    };
    IllustratorConnection.prototype.openBrowser = function (url) {
        var self = this;
        self.connection.openURLInDefaultBrowser(url);
    };
    IllustratorConnection.prototype.checkIfFileIsOpen = function (callback) {
        var self = this;
        self.connection.evalScript('isFileOpen();', callback);
    };
    IllustratorConnection.prototype.on = function (eventName, updateFunc) {
        var self = this;
        //window.onfocus = updateFunc;
        // TODO: when Illustrator adds more listeners, inject them here!
        
        if (eventName === 'noFile') {
            self.connection.addEventListener('documentAfterActivate', function (obj) {
                if (obj.data === '<documentAfterDeactivate><url/><name/></documentAfterDeactivate>') {
                    updateFunc();
                }
            });
        } else if (eventName === 'openFile') {
            self.connection.addEventListener('documentAfterActivate', function (obj) {
                if (obj.data !== '<documentAfterDeactivate><url/><name/></documentAfterDeactivate>') {
                    updateFunc();
                }
            });
        } else if (eventName === 'panelMenuEvent') {
            self.connection.addEventListener('com.adobe.csxs.events.flyoutMenuClicked', updateFunc);
        }
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
            isDark = (background.red + background.green + background.blue) / (3 * 255.0) <= 0.5;
        
        self.UI.fontFamily = i.baseFontFamily;
        self.UI.fontSize = i.baseFontSize;
        self.UI.backgroundColor = 'rgba(' + Math.floor(background.red) + ',' +
                                            Math.floor(background.green) + ',' +
                                            Math.floor(background.blue) + ',' +
                                            (background.alpha / 255.0) + ')';
        
        // Apply the font and colors
        jQuery('body')
            .css('font-family', self.UI.fontFamily)
            .css('font-size', self.UI.fontSize)
            .css('background-color', self.UI.backgroundColor);
        
        // Load the appropriate stylesheet and relevant hacks
        if (isDark === true) {
            window.scriptLoader.loadStylesheet('../../common/dark.css', false);
            jQuery('.selectArrow').attr('src', '../../img/selectArrowDark.png');
            self.aceEditors.forEach(function (e) {
                e.setTheme("ace/theme/tomorrow_night_eighties");
            });
        } else {
            window.scriptLoader.loadStylesheet('../../common/light.css', false);
            jQuery('.selectArrow').attr('src', '../../img/selectArrowLight.png');
            self.aceEditors.forEach(function (e) {
                e.setTheme("ace/theme/tomorrow");
            });
        }
    };
    IllustratorConnection.prototype.setFlyoutMenu = function (xml, callback) {
        var self = this;
        
        self.connection.setPanelFlyoutMenu(xml, callback);
    };
    
    window.illustrator = new IllustratorConnection();
});