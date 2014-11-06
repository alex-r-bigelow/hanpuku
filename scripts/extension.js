/*jslint evil:true*/
(function () {
    var extensionScope = this;
    
    function IllustratorConnection () {
        var self = this;
        
        self.connection = new CSInterface();
        // Load the libraries that JSX scripts need
        self.loadedJSXlibs = false;
        self.loadJSXlibs();
    }
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
                        console.warn(r);
                        throw "Error Loading JSX";
                    }
                    i += 1;
                    if (i < DomManager.JSX_LIBS.length) {
                        ejQuery.ajax({
                            url: DomManager.JSX_LIBS[i],
                            success: successFunction
                        });
                    } else {
                        self.loadedJSXlibs = true;
                    }
                });
            };
        ejQuery.ajax({
            url: DomManager.JSX_LIBS[i],
            success: successFunction
        });
    };
    IllustratorConnection.prototype.runJSX = function (input, path, callback) {
        var self = this;
        if (self.loadedJSXlibs === false) {
            // Try again in a second...
            window.setTimeout(function () { self.runJSX(input, path, callback); }, 1000);
        } else {
            ejQuery.ajax({
                url: path,
                success: function (script) {
                    script = "var input=" + JSON.stringify(input) + ";\n" + script;
                    self.connection.evalScript(script, function (r) {
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
    };
    
    
    function ExtensionManager() {
        var self = this;
        
        /**
        * First load up any libraries / scripts the extension needs.
        * I load scripts this way instead of the HTML header so that
        * the JS namespace isn't polluted with all my scripts
        * and libraries
        */
        var s;
        window.module = undefined; // hack to get jQuery to load properly
        for (s = 0; s < ExtensionManager.EXTENSION_SCRIPTS.length; s += 1) {
            self.loadScript(ExtensionManager.EXTENSION_SCRIPTS[s]);
        }
        /**
         * A little hack to differentiate between libraries
         * that are loaded in context of the extension, and which
         * are loaded in context of the DOM iframe. Extension-level libraries
         * start with 'e' (jQuery will get overwritten in the iframe)
         */
        extensionScope.ejQuery = jQuery;
        extensionScope.ed3 = d3;
        //jQuery = undefined;
        //d3 = undefined;
    }
    ExtensionManager.EXTENSION_SCRIPTS = [
        "lib/jquery-1.11.0.min.js",
        "lib/CSInterface.js",
        "lib/phrogz.js",
        "lib/d3.min.js",
        "lib/htmlParser.js",
        "scripts/iD3.js",
        "scripts/examplesManager.js",
        "scripts/domManager.js",
        "scripts/dataManager.js",
        "scripts/codeManager.js"
    ];
    ExtensionManager.PANELS = {
        "Examples" : {
            "advanced" : true,
            "views" : {
                "examplesView" : {
                    "bounds" : ['0px', '0px', '0px', '0px']
                }
            }
        },
        "Data" : {
            "advanced" : false,
            "views" : {
                "dataEditor" : {
                    "bounds" : ['0px', '0px', '50%', '0px']
                },
                "dataPreview" : {
                    "bounds" : ['50%', '0px', '0px', '0px'],
                    "showSelection" : false
                }
            }
        },
        "Bindings" : {
            "advanced" : false,
            "views" : {
                "domPreview" : {
                    "bounds" : ['0px', '0px', '50%', '200px']
                },
                "selectionQueryTools" : {
                    "bounds" : ['0px', 'calc(100% - 200px)', '50%', '0px']
                },
                "dataPreview" : {
                    "bounds" : ['50%', '0px', '0px', '0px'],
                    "showSelection" : true
                }
            }
        },
        "Influence" : {
            "advanced" : false,
            "views" : {
                "domPreview" : {
                    "bounds" : ['0px', '0px', '50%', '0px']
                },
                "influenceTools" : {
                    "bounds" : ['50%', '0px', '0px', '0px']
                }
            }
        },
        "JS" : {
            "advanced" : true,
            "views" : {
                "domPreview" : {
                    "bounds" : ['0px', '0px', '50%', '0px']
                },
                "jsEditor" : {
                    "bounds" : ['50%', '0px', '0px', '0px']
                }
            }
        },
        "CSS" : {
            "advanced" : true,
            "views" : {
                "domPreview" : {
                    "bounds" : ['0px', '0px', '50%', '0px']
                },
                "cssEditor" : {
                    "bounds" : ['50%', '0px', '0px', '0px']
                }
            }
        }
    };
    ExtensionManager.prototype.loadScript = function (scriptName) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState === 4) {
                if (xmlhttp.status === 200 || xmlhttp.status === 0) {
                eval.apply(extensionScope, [xmlhttp.responseText]);
                } else {
                    throw 'Error ' + xmlhttp.status + ' loading library: ' + scriptName;
                }
            }
        };
        xmlhttp.open("GET", scriptName, false);
        xmlhttp.send();
    };
    ExtensionManager.prototype.initUI = function () {
        // Get Illustrator's UI settings
        var self = this,
            i = ILLUSTRATOR.connection.getHostEnvironment().appSkinInfo,
            background = i.panelBackgroundColor.color,
            useWhite = (background.red + background.green + background.blue)/(3*255.0) <= 0.5;
        
        self.textColor = useWhite ? '#fff' : '#000';
        self.oppositeTextColor = useWhite ? '#000' : '#fff';
        self.fontFamily = i.baseFontFamily;
        self.fontSize = i.baseFontSize;
        
        self.backgroundColor = 'rgba(' + Math.floor(background.red) + ',' +
                                Math.floor(background.green) + ',' +
                                Math.floor(background.blue) + ',' +
                                0.5*(background.alpha/255.0) + ')';
        
        self.textBackgroundColor = 'rgba(' + Math.floor(background.red) + ',' +
                                            Math.floor(background.green) + ',' +
                                            Math.floor(background.blue) + ',' +
                                            (background.alpha/255.0) + ')';
        self.bodyColor = 'rgba(' + Math.floor(background.red) + ',' +
                                   Math.floor(background.green) + ',' +
                                   Math.floor(background.blue) + ',' +
                                   0.75*(background.alpha/255.0) + ')';
        self.haloColor = 'rgba(' + (255 - Math.floor(background.red)) + ',' +
                                (255 - Math.floor(background.green)) + ',' +
                                (255 - Math.floor(background.blue)) + ',' +
                                (background.alpha/255.0) + ')';
        self.buttonColor = 'rgba(' + Math.floor(background.red) + ',' +
                                    Math.floor(background.green) + ',' +
                                    Math.floor(background.blue) + ',' +
                                    0.25*(background.alpha/255.0) + ')';
        
        // Apply the font and colors
        ejQuery('body').css('font-family', self.fontFamily)
                       .css('font-size', self.fontSize)
                       .css('background-color', self.backgroundColor);
        
        ejQuery('.halo').css('background-color', self.haloColor)
                        .css('color', self.oppositeTextColor);
        ejQuery('button, select').css('background-color', self.buttonColor);
        ejQuery('textarea').css('background-color', self.textBackgroundColor)
                           .css('color', self.textColor);
        
        
        // Init the tab buttons
        var p, panel, v, view;
        for (p in ExtensionManager.PANELS) {
            if (ExtensionManager.PANELS.hasOwnProperty(p)) {
                panel = ExtensionManager.PANELS[p];
                for (v in panel.views) {
                    if (panel.views.hasOwnProperty(v)) {
                        view = panel.views[v];
                        ejQuery('#' + v).hide();
                    }
                }
                ejQuery('#' + p + '_PanelButton')
                    .css('color', self.oppositeTextColor);
            }
        }
        self.advancedMode();
        self.switchTab('Data');
    };
    ExtensionManager.prototype.switchTab = function (tabId) {
        var self = this,
            oldTab = ejQuery('#extensionControls button.active').attr('id'),
            button,
            v,
            view,
            viewElement;
        
        if (oldTab !== undefined) {
            button = ejQuery('#' + oldTab);
            button.attr('class', null);
            button.css('color', self.oppositeTextColor);
            
            oldTab = oldTab.substring(0,oldTab.length-12);
            for (v in ExtensionManager.PANELS[oldTab].views) {
                if (ExtensionManager.PANELS[oldTab].views.hasOwnProperty(v)) {
                    ejQuery('#' + v).hide();
                }
            }
        }
        
        button = ejQuery('#' + tabId + '_PanelButton');
        button.attr('class', 'active');
        button.css('color', self.textColor);
        
        for (v in ExtensionManager.PANELS[tabId].views) {
            if (ExtensionManager.PANELS[tabId].views.hasOwnProperty(v)) {
                view = ExtensionManager.PANELS[tabId].views[v];
                viewElement = ejQuery('#' + v);
                
                viewElement.show();
                viewElement.css('position','absolute');
                viewElement.css('left', view.bounds[0]);
                viewElement.css('top', view.bounds[1]);
                viewElement.css('right', view.bounds[2]);
                viewElement.css('bottom', view.bounds[3]);
                
                if (v === 'dataPreview') {
                    DATA.showSelection = view.showSelection;
                    DATA.updatePanel();
                }
            }
        }
    };
    ExtensionManager.prototype.advancedMode = function () {
        var p;
        if (ejQuery('#advancedMode').prop("checked") === true) {
            for (p in ExtensionManager.PANELS) {
                if (ExtensionManager.PANELS.hasOwnProperty(p)) {
                    ejQuery('#' + p + '_PanelButton').show();
                }
            }
            ejQuery('#sampleSelect').show();
        } else {
            for (p in ExtensionManager.PANELS) {
                if (ExtensionManager.PANELS.hasOwnProperty(p) &&
                        ExtensionManager.PANELS[p].advanced === true) {
                    ejQuery('#' + p + '_PanelButton').hide();
                }
            }
            ejQuery('#sampleSelect').hide();
        }
    };
    ExtensionManager.prototype.updateUI = function () {
        
    };
    
    ExtensionManager.prototype.debug = function () {
        DATA.loadSampleDataFile('examples/miserables.json');
        CODE.loadSampleJSFile('examples/force.js');
        CODE.loadSampleCSSFile('examples/force.css');
        CODE.runJS();
    };
    
    window.setupExtension = function () {
        extensionScope.TYPING_INTERVAL = 2000;
        extensionScope.SELECTED_IDS = null;
        
        extensionScope.EXTENSION = new ExtensionManager();
        
        extensionScope.EXAMPLES = new ExamplesManager();
        
        extensionScope.ILLUSTRATOR = new IllustratorConnection();
        
        extensionScope.DATA = new DataManager();
        
        extensionScope.EXTENSION.initUI();
        
        extensionScope.DOM = new DomManager('domPreviewContent');
        
        extensionScope.DOM.docToDom();
        
        extensionScope.CODE = new CodeManager();
        
        extensionScope.EXTENSION.debug();
    };
})();