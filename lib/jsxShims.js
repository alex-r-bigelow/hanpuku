// Shim - ExtendScript doesn't have indexOf
if (typeof Array.prototype.indexOf !== "function") {
    Array.prototype.indexOf = function (el) {
        "use strict";
        var i;
        for (i = 0; i < this.length; i += 1) {
            if (el === this[i]) {
                return i;
            }
        }
        return -1;
    };
}

// Shim - jsx strings don't have the trim() function
String.prototype.trim = function () {
    "use strict";
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
};

// Shim - A way to send out console messages
function ConsoleProxy() {
    "use strict";
    var self = this;
    self.logs = [];
    self.error = null;
    self.output = null;
}
ConsoleProxy.prototype.log = function () {
    "use strict";
    var self = this,
        i,
        result = "";
    for (i = 0; i < arguments.length; i += 1) {
        if (i > 0) {
            result += " ";
        }
        result += String(arguments[i]);
    }
    self.logs.push(result);
};
ConsoleProxy.prototype.logError = function (e) {
    "use strict";
    var self = this;
    self.error = {
        'message' : String(e.message),
        'line' : String(e.line - 1)
    };
};
ConsoleProxy.prototype.setOutput = function (o) {
    "use strict";
    var self = this;
    self.output = o;
};
ConsoleProxy.prototype.jsonPacket = function () {
    "use strict";
    var self = this,
        temp = JSON.stringify({
            'logs' : self.logs,
            'error' : self.error,
            'output' : self.output
        });
    // Reset for next time
    self.logs = [];
    self.error = null;
    self.output = null;
    return temp;
};

var console = new ConsoleProxy();