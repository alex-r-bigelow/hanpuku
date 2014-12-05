/*jslint evil:true*/
(function () {
    var extensionScope = this;
    
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
        
        self.messages = [];
        self.messageTimer = undefined;
    }
    ExtensionManager.MESSAGE_DELAY = 5000;
    ExtensionManager.ANIMATION_DELAY = 500;
    ExtensionManager.EXTENSION_SCRIPTS = [
        "lib/jquery-1.11.0.min.js",
        "lib/json-circular.js",
        "lib/CSInterface.js",
        "lib/phrogz.js",
        "lib/d3.min.js",
        "lib/queue.min.js",
        "lib/topojson.js",
        "lib/colorbrewer.js",
        "lib/htmlParser.js",
        "lib/hanpuku.js",
        "scripts/examplesManager.js",
        "scripts/illustratorConnection.js",
        "scripts/dataManager.js",
        "scripts/mappingManager.js",
        "scripts/domManager.js",
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
        xmlhttp.open("GET", scriptName + "?" + (new Date().getTime()), false);
        xmlhttp.send();
    };
    ExtensionManager.prototype.init = function () {
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
                           .css('color', self.textColor)
                           .css('font-size', self.fontSize);
        ejQuery('#dataPreview').css('background-color', self.bodyColor);
        
        
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
        self.switchTab('Examples');
        
        // Init the message area
        ejQuery('#messageOverlay').hide();
    };
    ExtensionManager.prototype.displayMessage = function (message) {
        var self = this,
            mobj = {
                'html' : message,
                'timer' : undefined
            },
            mContents = "";
        
        self.messages.push(mobj);
        // Update the message area contents
        for (i = 0; i < self.messages.length; i += 1) {
            mContents += "<p>" + self.messages[i].html + "</p>";
        }
        ejQuery('#messageOverlay').html(mContents).fadeIn(ExtensionManager.ANIMATION_DELAY);
        
        function clearMessage(m) {
            // First, remove the message from the array
            var i = self.messages.indexOf(m),
                contents = "";
            
            if (i !== -1) {
                self.messages.splice(i, 1);
            }
            
            if (self.messages.length > 0) {
                // Update the message area contents
                for (i = 0; i < self.messages.length; i += 1) {
                    contents += "<p>" + self.messages[i].html + "</p>";
                }
                ejQuery('#messageOverlay').html(contents);
            } else {
                ejQuery('#messageOverlay').fadeOut(ExtensionManager.ANIMATION_DELAY);
            }
        }
        
        mobj.timer = setTimeout(function () { clearMessage(mobj); }, ExtensionManager.MESSAGE_DELAY);
    };
    ExtensionManager.prototype.clearMessages = function () {
        var self = this,
            i;
            
        for (i = 0; i < self.messages.length; i += 1) {
            clearTimeout(self.messages[i].timer);
        }
        self.messages = [];
        ejQuery('#messageOverlay').html("").hide();
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
    
    
    ExtensionManager.prototype.notifyRefresh = function () {
        var self = this;
        
        if (DOM.docName === undefined) {
            self.disableUI();
            DOM.disableUI();
            CODE.disableUI();
            //MAP.disableUI();
            // DATA.disableUI();   I'll start caring when we embed files
        } else {
            self.onRefresh();
            DOM.onRefresh();
            CODE.onRefresh();
            //MAP.onRefresh();
            // DATA.refresh();
        }
    };
    ExtensionManager.prototype.disableUI = function () {
        ejQuery('#refreshButton, #applyButton').attr('disabled', true);
    };
    ExtensionManager.prototype.onRefresh = function () {
        ejQuery('#refreshButton, #applyButton').attr('disabled', false);
    };
    
    ExtensionManager.prototype.notifyNewData = function () {
        //MAP.onNewData();
    };
    
    ExtensionManager.prototype.notifyHighlightChange = function () {
        // DOM.onHighlightChange();
        // MAP.onHighlightChange();
    };
    
    ExtensionManager.prototype.debug = function () {
        /*
        Load force-directed graph:
        
        DATA.loadSampleDataFile('examples/miserables.json');
        CODE.loadSampleJSFile('examples/force.js');
        CODE.loadSampleCSSFile('examples/force.css');
        CODE.runJS();*/
    };
    
    window.setupExtension = function () {
        extensionScope.TYPING_INTERVAL = 2000;
        
        extensionScope.EXTENSION = new ExtensionManager();
        extensionScope.EXAMPLES = new ExamplesManager();
        extensionScope.ILLUSTRATOR = new IllustratorConnection();
        extensionScope.DATA = new DataManager();
        extensionScope.MAP = new MappingManager();
        extensionScope.DOM = new DomManager();
        extensionScope.CODE = new CodeManager();
        
        extensionScope.EXTENSION.init();
        extensionScope.EXAMPLES.init();
        extensionScope.ILLUSTRATOR.init();
        extensionScope.DATA.init();
        //extensionScope.MAP.init();
        extensionScope.DOM.init();
        extensionScope.CODE.init();
        
        extensionScope.ILLUSTRATOR.refresh();
        extensionScope.EXTENSION.debug();
    };
})();