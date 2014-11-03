/*jslint evil:true*/
(function () {
    var extensionScope = this;
    
    function ExtensionManager() {
        var self = this;
        
        /**
        * First load up any libraries / scripts the extension needs.
        * I load scripts this way instead of the HTML header so that
        * the iframe DOM's namespace isn't polluted with all my scripts
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
         * are loaded in context of the iframe. Extension-level libraries
         * start with 'e'
         */
        extensionScope.ejQuery = jQuery;
        extensionScope.ed3 = d3;
        jQuery = undefined;
        d3 = undefined;
    }
    ExtensionManager.EXTENSION_SCRIPTS = [
        "lib/jquery-1.11.0.min.js",
        "lib/CSInterface.js",
        "lib/pwnCSS.js",
        "lib/phrogz.js",
        "lib/d3.min.js",
        "scripts/iD3.js",
        "scripts/domManager.js",
        "scripts/dataManager.js"
    ];
    
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
    
    ExtensionManager.prototype.setupUI = function (CSLibrary) {
        var self = this,
            i = CSLibrary.getHostEnvironment().appSkinInfo,
            background = i.panelBackgroundColor.color,
            useWhite = (background.red + background.green + background.blue)/(3*255.0) <= 0.5;
        
        self.textColor = useWhite ? '#fff' : '#000';
        self.oppositeTextColor = useWhite ? '#000' : '#fff';
        
        self.backgroundColor = 'rgba(' + Math.floor(background.red) + ',' +
                                Math.floor(background.green) + ',' +
                                Math.floor(background.blue) + ',' +
                                (background.alpha/255.0) + ')';
        
        self.textBackgroundColor = 'rgba(' + Math.floor(background.red) + ',' +
                                            Math.floor(background.green) + ',' +
                                            Math.floor(background.blue) + ',' +
                                            (background.alpha/255.0) + ')';
        self.bodyColor = 'rgba(' + Math.floor(background.red) + ',' +
                                   Math.floor(background.green) + ',' +
                                   Math.floor(background.blue) + ',' +
                                   0.9*(background.alpha/255.0) + ')';
        self.haloColor = useWhite ? 'rgba(255,255,255,0.75)' : 'rgba(150,150,150,0.75)';
        self.buttonColor = 'rgba(' + Math.floor(background.red) + ',' +
                                    Math.floor(background.green) + ',' +
                                    Math.floor(background.blue) + ',' +
                                    0.5*(background.alpha/255.0) + ')';
    };
    
    ExtensionManager.prototype.refresh = function () {
        
    };
    
    window.setupExtension = function () {
        extensionScope.EXTENSION = new ExtensionManager();
        extensionScope.DOM = new DomManager('domPreview');
        extensionScope.DATA = new DataManager();
        
        extensionScope.DOM.docToDom();
    };
})();