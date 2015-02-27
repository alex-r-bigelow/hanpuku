/*globals CSInterface, console, ejQuery, DOM, d3, EXTENSION*/
function IllustratorConnection() {
    "use strict";
    var self = this;
    
    self.connection = new CSInterface();
    // Load the libraries that JSX scripts need
    self.loadedJSXlibs = false;
    self.loadJSXlibs();
    
    self.selectedIDs = [];
}
IllustratorConnection.JSX_LIBS = [
    'lib/json2.js',
    'lib/jsxShims.js'
];
/* Tools to interact with extendScript */
IllustratorConnection.prototype.loadJSXlibs = function () {
    "use strict";
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
                if (i < IllustratorConnection.JSX_LIBS.length) {
                    ejQuery.ajax({
                        url: IllustratorConnection.JSX_LIBS[i],
                        success: successFunction
                    });
                } else {
                    self.loadedJSXlibs = true;
                }
            });
        };
    ejQuery.ajax({
        url: IllustratorConnection.JSX_LIBS[i],
        success: successFunction,
        cache: false
    });
};
IllustratorConnection.prototype.runJSX = function (input, path, callback) {
    "use strict";
    var self = this,
        i;
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
                    if (r.isOk === false) {
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
                            console.warn("JSX Error in " + path + " on line: " + result.error.line);
                            throw "JSX Error: " + result.error.message;
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
    "use strict";
    var self = this;
    self.connection.openURLInDefaultBrowser(url);
};
IllustratorConnection.prototype.init = function () {
    "use strict";
    var self = this,
        updateFunc = function () { DOM.docToDom(); };
    //window.onfocus = updateFunc;
    // TODO: when Illustrator adds more listeners, inject them here!
    self.connection.addEventListener('documentAfterActivate', updateFunc);
    self.connection.addEventListener('documentAfterDeactivate', updateFunc);
};
IllustratorConnection.prototype.getD3selection = function () {
    "use strict";
    var self = this;
    if (self.selectedIDs.length === 0) {
        return d3.select('givemeanemptyselection'); // definitely not a tag name...
    } else {
        return d3.selectAll('#' + self.selectedIDs.join(', #'));
    }
};
IllustratorConnection.prototype.updateSelection = function (d3selection) {
    "use strict";
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
IllustratorConnection.prototype.refresh = function () {
    "use strict";
    DOM.docToDom();
    EXTENSION.notifyRefresh();
};
IllustratorConnection.prototype.apply = function () {
    "use strict";
    DOM.domToDoc();
    DOM.docToDom();
};