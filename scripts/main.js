/*jslint evil:true*/
(function () {
    var extensionScope = this,
        EXTENSION,
        DOM,
        DATA;
    
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
         * are loaded in context of the iframe. Extension libraries
         * start with 'e'
         */
        extensionScope.ejQuery = jQuery;
        jQuery = undefined;
        extensionScope.ed3 = d3;
        d3 = undefined;
    }
    ExtensionManager.EXTENSION_SCRIPTS = [
        "lib/jquery-1.11.0.min.js",
        "lib/CSInterface.js",
        "lib/pwnCSS.js",
        "lib/d3.min.js",
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
    
    window.setupExtension = function () {
        EXTENSION = new ExtensionManager();
        DOM = new DomManager('domPreview');
        DATA = new DataManager();
    };
})();