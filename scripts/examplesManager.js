function ExamplesManager () {
    var self = this;
    
    self.currentUrl = null;
    self.content = null;
    
    self.history = [];
    
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
    }
};
ExamplesManager.prototype.update = function () {
    var self = this;
    // Update back / forward buttons
    ejQuery('#examplesBackButton').attr('disabled', self.history.indexOf(self.currentUrl) <= 0);
    ejQuery('#examplesForwardButton').attr('disabled', self.history.indexOf(self.currentUrl) >= self.history.length - 1);
    
    // Can the new page be imported?
    ejQuery.ajax({
        type : "GET",
        url : self.iframe.contentWindow.location.href,
        dataType : "text",
        success: function (scrapedPage) {
            self.attemptToLoad(scrapedPage);
            ejQuery('#examplesLoadButton').attr('disabled', !self.canLoad());
        }
    });
};
ExamplesManager.prototype.canLoad = function () {
    var self = this;
    return self.content !== null && self.content.extractables !== null;
};
ExamplesManager.prototype.attemptToLoad = function (scrapedPage) {
    // TODO
    /* var self = this,
        temp, temp2, i, j;
    
    try {
        var parser = new DOMParser();
        self.content = {
            'dom' : ejQuery(parser.parseFromString(scrapedPage, 'text/html')),
            'extractables' : null
        };
    } catch (e) {
        self.content = null;
        return;
    }
    
    if (!self.content.dom) {
        self.content = null;
        return;
    }
    
    
    temp = self.content.dom.find('.gist-source code');
    console.log(temp[0]);
    for (i = 0; i < temp.length; i += 1) {
        temp2 = temp[i].getElementsByTagName('code');
    }
    */
};
/*

http://bl.ocks.org/mbostock/e48a00d4db5c3b042145

*/