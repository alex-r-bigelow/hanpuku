/*jslint evil:true*/
/*globals ejQuery, jQuery, EXTENSION, DOM, FileReader, TYPING_INTERVAL, clearTimeout, setTimeout*/

function CodeManager() {
    "use strict";
    var self = this;
        
    self.cssTypingTimer = undefined;
}
CodeManager.prototype.init = function () {
    "use strict";
};
CodeManager.prototype.loadSampleJSFile = function (url, docName) {
    "use strict";
    ejQuery.ajax({
        url : url,
        success : function (codeString) {
            if (docName) {
                codeString = 'var doc = d3.select("#' + docName + '");\n' + codeString;
            }
            ejQuery('#jsTextEditor').val(codeString);
            EXTENSION.displayMessage('Updated JS');
        },
        cache: false
    });
};
CodeManager.prototype.loadSampleJS = function (codeString) {
    "use strict";
    ejQuery('#jsTextEditor').val(codeString);
    EXTENSION.displayMessage('Updated JS');
};
CodeManager.prototype.loadJSFile = function () {
    "use strict";
    var newFile = ejQuery('#jsFileInput')[0].files[0],
        fileReader = new FileReader();
    fileReader.onload = function (e) {
        ejQuery('#jsTextEditor').val(e.target.result);
        EXTENSION.displayMessage('Updated JS');
    };
    fileReader.readAsText(newFile);
};
CodeManager.prototype.runJS = function () {
    "use strict";
    if (DOM.runScript(ejQuery('#jsTextEditor').val()) === true) {
        EXTENSION.displayMessage('JS Script finished successfully.');
    }
};

CodeManager.prototype.updateCSS = function () {
    "use strict";
    jQuery('#userCSS').remove();
    var style = DOM.iframe.contentDocument.createElement('style');
    style.setAttribute('id', 'userCSS');
    style.appendChild(DOM.iframe.contentDocument.createTextNode(ejQuery('#cssTextEditor').val()));
    DOM.iframe.contentDocument.head.appendChild(style);
};
CodeManager.prototype.loadCSSFile = function () {
    "use strict";
    var self = this,
        newFile = ejQuery('#cssFileInput')[0].files[0],
        fileReader = new FileReader();
    fileReader.onload = function (e) {
        ejQuery('#cssTextEditor').val(e.target.result);
        EXTENSION.displayMessage('Updated CSS');
        self.updateCSS();
    };
    fileReader.readAsText(newFile);
};
CodeManager.prototype.loadSampleCSSFile = function (url) {
    "use strict";
    var self = this;
    ejQuery.ajax({
        url: url,
        success: function (codeString) {
            ejQuery('#cssTextEditor').val(codeString);
            EXTENSION.displayMessage('Updated CSS');
            self.updateCSS();
        },
        cache: false
    });
};
CodeManager.prototype.loadSampleCSS = function (codeString) {
    "use strict";
    var self = this;
    ejQuery('#cssTextEditor').val(codeString);
    EXTENSION.displayMessage('Updated CSS');
    self.updateCSS();
};
CodeManager.prototype.editCSS = function () {
    "use strict";
    var self = this;
    clearTimeout(self.cssTypingTimer);
    self.cssTypingTimer = setTimeout(function () {
        self.updateCSS();
    }, TYPING_INTERVAL);
};
CodeManager.prototype.disableUI = function () {
    "use strict";
    ejQuery('#runButton').text('(Need a document to run)').attr('disabled', true);
};
CodeManager.prototype.onRefresh = function () {
    "use strict";
    ejQuery('#runButton').text('Run').attr('disabled', false);
};