/*jslint evil:true*/
/*globals window, document, console, XMLHttpRequest*/

(function () {
    "use strict";
    function ScriptLoader() {
        var self = this;
        self.loadedScripts = [];
    }
    ScriptLoader.prototype.require = function (scriptList, callback, cache) {
        var self = this,
            alreadyLoadedScripts = self.loadedScripts.length,
            importScope = {},
            checkIfLoaded = function () {
                if (scriptList.length + alreadyLoadedScripts > self.loadedScripts.length) {
                    window.setTimeout(checkIfLoaded, 1000);
                } else {
                    callback.call(importScope);
                }
            },
            s;
        
        window.module = undefined;  // hack to get jQuery to load properly
        
        for (s = 0; s < scriptList.length; s += 1) {
            if (self.loadedScripts.indexOf(scriptList[s]) !== -1) {
                alreadyLoadedScripts -= 1;
            } else {
                self.loadScript(importScope, scriptList[s], cache);
            }
        }
        
        checkIfLoaded();
    };
    ScriptLoader.prototype.loadScript = function (scope, scriptName, cache) {
        var self = this,
            xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState === 4) {
                if (xmlhttp.status === 200 || xmlhttp.status === 0) {
                    eval.apply(scope, [xmlhttp.responseText + '\n//@ sourceURL=' + scriptName]);   // the extra comment enables normal debugging
                    self.loadedScripts.push(scriptName);
                } else {
                    throw new Error('Error ' + xmlhttp.status + ' loading library: ' + scriptName);
                }
            }
        };
        scriptName = cache === true ? scriptName : scriptName + "?" + new Date().getTime();
        xmlhttp.open("GET", scriptName, false);
        xmlhttp.send();
    };
    ScriptLoader.prototype.loadStylesheet = function (stylesheetName, cache) {
        var self = this,
            xmlhttp = new XMLHttpRequest(),
            style;
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState === 4) {
                if (xmlhttp.status === 200 || xmlhttp.status === 0) {
                    style = document.createElement('style');
                    style.setAttribute('type', 'text/css');
                    document.head.appendChild(style);
                    style.innerText = xmlhttp.responseText;
                } else {
                    throw new Error('Error ' + xmlhttp.status + ' loading stylesheet: ' + stylesheetName);
                }
            }
        };
        stylesheetName = cache === true ? stylesheetName : stylesheetName + "?" + new Date().getTime();
        xmlhttp.open("GET", stylesheetName, false);
        xmlhttp.send();
    };
    
    window.scriptLoader = new ScriptLoader();
}());