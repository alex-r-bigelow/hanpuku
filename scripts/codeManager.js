/*jslint evil:true*/

function CodeManager () {
    var self = this;
        
    self.cssTypingTimer = undefined;
}
CodeManager.prototype.loadSampleJS = function (codeString) {
    ejQuery('#jsTextEditor').val(codeString);
};
CodeManager.prototype.loadJSFile = function () {
    var newFile = ejQuery('#jsFileInput')[0].files[0],
        fileReader = new FileReader();
    fileReader.onload = function (e) {
        ejQuery('#jsTextEditor').val(e.target.result);
    };
    fileReader.readAsText(newFile);
};
CodeManager.prototype.runJS = function () {
    DOM.runScript(ejQuery('#jsTextEditor').val());
};

CodeManager.prototype.updateCSS = function () {
    jQuery('#userCSS').remove();
    var style = DOM.iframe.contentDocument.createElement('style');
    style.setAttribute('id','userCSS');
    style.appendChild(DOM.iframe.contentDocument.createTextNode(ejQuery('#cssTextEditor').val()));
    DOM.iframe.contentDocument.head.appendChild(style);
};
CodeManager.prototype.loadCSSFile = function () {
    var self = this,
        newFile = ejQuery('#cssFileInput')[0].files[0],
        fileReader = new FileReader();
    fileReader.onload = function (e) {
        ejQuery('#cssTextEditor').val(e.target.result);
        self.updateCSS();
    };
    fileReader.readAsText(newFile);
};
CodeManager.prototype.loadSampleCSS = function (codeString) {
    var self = this;
    ejQuery('#cssTextEditor').val(codeString);
    self.updateCSS();
};
CodeManager.prototype.editCSS = function () {
    var self = this;
    clearTimeout(self.cssTypingTimer);
    self.cssTypingTimer = setTimeout(function () {
        self.updateCSS();
    }, TYPING_INTERVAL);
};