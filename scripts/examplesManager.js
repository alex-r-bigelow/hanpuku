function ExamplesManager () {
    var self = this;
    
    self.currentUrl = null;
    self.content = null;
    
    self.history = [];
    self.loadingTimer = undefined;
    self.importableStuff = null;
    
    self.iframe = ejQuery('#examplesBrowser')[0];
    self.iframe.onload = function () { self.pushUrl(); };
    
    self.changeUrl();
    self.update();
}
ExamplesManager.prototype.pushUrl = function () {
    var self = this,
        newUrl = self.iframe.contentWindow.location.href,
        currentIndex = self.history.indexOf(self.currentUrl),
        isForward = (self.history.length - 1 > currentIndex && self.history[currentIndex + 1] === newUrl),
        isBack = (currentIndex > 0 && self.history[currentIndex - 1] === newUrl);
    
    // page loaded properly
    clearTimeout(self.loadingTimer);
    
    // suppress console messages from other sites
    //console.clear();
    
    if (!isForward && !isBack) {
        self.history.splice(currentIndex + 1);
        self.history.push(newUrl);
    }
    self.currentUrl = newUrl;
    ejQuery('#examplesUrl').val(newUrl);
    self.update();
};
ExamplesManager.prototype.back = function () {
    var self = this;
    self.iframe.src = self.history[self.history.indexOf(self.currentUrl) - 1];
};
ExamplesManager.prototype.forward = function () {
    var self = this;
    self.iframe.src = self.history[self.history.indexOf(self.currentUrl) + 1];
};
ExamplesManager.prototype.changeUrl = function () {
    var self = this,
        newUrl = ejQuery('#examplesUrl').val();
    if (newUrl !== self.currentUrl) {
        self.currentUrl = newUrl;
        if (!newUrl) {
            newUrl = 'examples/index.html';
        }
        self.iframe.src = newUrl;
        // Changing src will fire onload, and consequently pushUrl
        self.loadingTimer = setTimeout(function () {
            // Something went wrong loading the page...
            self.iframe.src = 'examples/error.html';
        }, 5000);
    }
};
ExamplesManager.prototype.update = function () {
    var self = this;
    
    // Update back / forward buttons
    ejQuery('#examplesBackButton').attr('disabled', self.history.indexOf(self.currentUrl) <= 0);
    ejQuery('#examplesForwardButton').attr('disabled', self.history.indexOf(self.currentUrl) >= self.history.length - 1);
    
    // Try to import from a bl.ocks.org page
    self.importableStuff = null;
    if (self.attemptExtraction() === false) {
        ejQuery('#examplesLoadButton').attr('disabled', true);
        ejQuery('#examplesLoadButton').html('Can\'t Import');
    } else {
        ejQuery('#examplesLoadButton').attr('disabled', false);
        ejQuery('#examplesLoadButton').html('Import');
    }
};
ExamplesManager.prototype.attemptExtraction = function () {
    var self = this;
    
    // Inception fans, rejoice! We're about to extract information from
    // an iframe inside an iframe...
    var gist = self.iframe.contentWindow.gist;
    if (gist === undefined) {
        return false;
    }
    
    var frame = self.iframe.contentDocument.getElementsByTagName('iframe')[0];
    if (frame === undefined) {
        return false;
    }
    
    var extension,
        scripts = frame.contentDocument.getElementsByTagName('script'),
        styles = frame.contentDocument.getElementsByTagName('style'),
        script = "",
        style = "",
        dataFiles = [],
        f,
        s;
    
    // Try to load up any data files
    for (f in gist.files) {
        if (gist.files.hasOwnProperty(f)) {
            extension = gist.files[f].filename.split('.');
            extension = extension[extension.length - 1].toLowerCase();
            
            if (DataManager.FORMAT_LOOKUP.hasOwnProperty(extension)) {
                dataFiles.push(frame.src + gist.files[f].filename);
            }
        }
    }
    
    // The script and style tags we want have no src or href attribute; get the
    // first ones that match, if they exist
    for (s = 0; s < scripts.length; s += 1) {
        if (scripts[s].getAttribute('src') === null) {
            script = scripts[s].innerText;
            break;
        }
    }
    for (s = 0; s < styles.length; s += 1) {
        if (styles[s].getAttribute('href') === null) {
            style = styles[s].innerText;
            break;
        }
    }
    
    if (script !== '' || style !== '' || dataFiles.length > 0) {
        self.importableStuff = {
            'script' : script,
            'style' : style,
            'dataFiles' : dataFiles
        };
        return true;
    } else {
        return false;
    }
};
ExamplesManager.prototype.loadBlock = function () {
    var self = this,
        d;
    if (self.importableStuff !== null){
        CODE.loadSampleJS(self.importableStuff.script);        
        CODE.loadSampleCSS(self.importableStuff.style);
        
        for (d = 0; d < self.importableStuff.dataFiles.length; d += 1) {
            DATA.loadSampleDataFile(self.importableStuff.dataFiles[d]);
        }
    }
};


// http://bl.ocks.org/mbostock/7607535