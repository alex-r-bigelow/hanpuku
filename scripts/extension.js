/*jslint evil:true*/
/*globals jQuery, d3, ejQuery, ed3, ILLUSTRATOR, DATA, DOM, CODE, MAP, ExamplesManager, IllustratorConnection, DataManager, MappingManager, DomManager, CodeManager, window, XMLHttpRequest, setTimeout, clearTimeout*/

(function () {
    var extensionScope = this;
    
    function ExtensionManager() {
        var self = this,
            s;
        
        /**
        * First load up any libraries / scripts the extension needs.
        * I load scripts this way instead of the HTML header so that
        * the JS namespace isn't polluted with all my scripts
        * and libraries
        */
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
        
        self.showDom = false;
        self.combinedApplyTimeout = null;
    }
    ExtensionManager.MESSAGE_DELAY = 5000;
    ExtensionManager.ANIMATION_DELAY = 700;
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
        "lib/convertUnits.js",
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
            "advanced" : false,
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
        "Code" : {
            "advanced" : false,
            "views" : {
                "jsEditor" : {
                    "bounds" : ['0px', '0px', '0px', '50%']
                },
                "cssEditor" : {
                    "bounds" : ['0px', '50%', '0px', '0px']
                }
            }
        },
        "CodeWDom" : {
            "advanced" : false,
            "views" : {
                "domPreview" : {
                    "bounds" : ['0px', '0px', '50%', '0px']
                },
                "jsEditor" : {
                    "bounds" : ['50%', '0px', '0px', '50%']
                },
                "cssEditor" : {
                    "bounds" : ['50%', '50%', '0px', '0px']
                }
            }
        }
    };
    ExtensionManager.prototype.loadScript = function (scriptName) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState === 4) {
                if (xmlhttp.status === 200 || xmlhttp.status === 0) {
                    eval.apply(extensionScope, [xmlhttp.responseText + '\n//@ sourceURL=' + scriptName]);   // the extra comment enables normal debugging
                } else {
                    throw new Error('Error ' + xmlhttp.status + ' loading library: ' + scriptName);
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
            useWhite = (background.red + background.green + background.blue) / (3 * 255.0) <= 0.5,
            p,
            panel,
            v,
            view;
        
        self.textColor = useWhite ? '#fff' : '#000';
        self.oppositeTextColor = useWhite ? '#000' : '#fff';
        self.fontFamily = i.baseFontFamily;
        self.fontSize = i.baseFontSize;
        self.largeFontSize = self.fontSize + 2;
        
        self.backgroundColor = 'rgba(' + Math.floor(background.red) + ',' +
                                Math.floor(background.green) + ',' +
                                Math.floor(background.blue) + ',' +
                                0.5 * (background.alpha / 255.0) + ')';
        
        self.textBackgroundColor = 'rgba(' + Math.floor(background.red) + ',' +
                                            Math.floor(background.green) + ',' +
                                            Math.floor(background.blue) + ',' +
                                            (background.alpha / 255.0) + ')';
        self.bodyColor = 'rgba(' + Math.floor(background.red) + ',' +
                                   Math.floor(background.green) + ',' +
                                   Math.floor(background.blue) + ',' +
                                   0.75 * (background.alpha / 255.0) + ')';
        self.haloColor = 'rgba(' + (255 - Math.floor(background.red)) + ',' +
                                (255 - Math.floor(background.green)) + ',' +
                                (255 - Math.floor(background.blue)) + ',' +
                                (background.alpha / 255.0) + ')';
        self.buttonColor = 'rgba(' + Math.floor(background.red) + ',' +
                                    Math.floor(background.green) + ',' +
                                    Math.floor(background.blue) + ',' +
                                    0.25 * (background.alpha / 255.0) + ')';
        
        // Apply the font and colors
        ejQuery('body').css('font-family', self.fontFamily)
                       .css('font-size', self.fontSize)
                       .css('background-color', self.backgroundColor);
        
        ejQuery('.halo').css('background-color', self.haloColor)
                        .css('color', self.oppositeTextColor);
        ejQuery('button, select').css('background-color', self.buttonColor);
        ejQuery('textarea').css('background-color', self.textBackgroundColor)
                           .css('color', self.textColor)
                           .css('font-size', self.largeFontSize);
        ejQuery('#dataPreview').css('background-color', self.bodyColor);
        
        
        // Init the tab buttons
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
    ExtensionManager.prototype.combinedApply = function () {
        var self = this;
        ILLUSTRATOR.refresh(function () {
            CODE.runJS();
            CODE.updateCSS();
            // in case this was an animated / interactive visualization,
            // give everything a chance to settle before applying
            self.combinedApplyTimeout = window.setTimeout(function () { ILLUSTRATOR.apply(); }, 2000);
        });
    };
    ExtensionManager.prototype.displayError = function (message) {
        "use strict";
        var self = this;
        self.displayMessage('<p style="color:#e00000;">ERROR: ' + message + '</p>');
    };
    ExtensionManager.prototype.displayWarning = function (message) {
        "use strict";
        var self = this;
        self.displayMessage('<p style="color:#ff5800;">WARNING: ' + message + '</p>');
    };
    ExtensionManager.prototype.displayMessage = function (message) {
        var self = this,
            mobj = {
                'html' : message,
                'timer' : undefined
            },
            mContents = "",
            i;
        
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
    ExtensionManager.prototype.toggleDom = function () {
        var self = this;
        self.switchTab('Code', true);
    };
    ExtensionManager.prototype.switchTab = function (tabId, toggleDom) {
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
            
            oldTab = oldTab.substring(0, oldTab.length - 12);
            if (oldTab === 'Code' && self.showDom === true) {
                oldTab = 'CodeWDom';
            }
            for (v in ExtensionManager.PANELS[oldTab].views) {
                if (ExtensionManager.PANELS[oldTab].views.hasOwnProperty(v)) {
                    ejQuery('#' + v).hide();
                }
            }
        }
        
        if (toggleDom === true) {
            self.showDom = !self.showDom;
        }
        
        button = ejQuery('#' + tabId + '_PanelButton');
        button.attr('class', 'active');
        button.css('color', self.textColor);
        
        if (tabId === 'Code') {
            if (self.showDom === true) {
                tabId = 'CodeWDom';
                ejQuery('#DomButtons').show();
                ejQuery('#CombinedButtons').hide();
            } else {
                ejQuery('#DomButtons').hide();
                ejQuery('#CombinedButtons').show();
            }
        } else {
            ejQuery('#DomButtons').hide();
            ejQuery('#CombinedButtons').hide();
        }
        for (v in ExtensionManager.PANELS[tabId].views) {
            if (ExtensionManager.PANELS[tabId].views.hasOwnProperty(v)) {
                view = ExtensionManager.PANELS[tabId].views[v];
                viewElement = ejQuery('#' + v);
                
                viewElement.show();
                viewElement.css('position', 'absolute');
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
            MAP.disableUI();
            // DATA.disableUI();   I'll start caring when we embed files
        } else {
            self.onRefresh();
            DOM.onRefresh();
            CODE.onRefresh();
            MAP.onRefresh();
            // DATA.refresh();
        }
    };
    ExtensionManager.prototype.disableUI = function () {
        ejQuery('#applyButton, #combinedApplyButton').attr('disabled', true);
    };
    ExtensionManager.prototype.onRefresh = function () {
        ejQuery('#applyButton, #combinedApplyButton').attr('disabled', false);
    };
    
    ExtensionManager.prototype.notifyNewData = function () {
        MAP.onNewData();
    };
    
    ExtensionManager.prototype.notifyHighlightChange = function () {
        // DOM.onHighlightChange();
        // MAP.onHighlightChange();
    };
    
    ExtensionManager.prototype.debug = function () {
        // CODE.loadSampleJSFile('testing/arcTest.js', 'arcTest.js');
        // CODE.loadSampleJSFile('testing/fontTest.js', 'fontTest.js');
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
        extensionScope.MAP.init();
        extensionScope.DOM.init();
        extensionScope.CODE.init();
        
        extensionScope.ILLUSTRATOR.refresh();
        extensionScope.EXTENSION.debug();
        
    };
}());