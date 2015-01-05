/*jslint evil:true*/
function DataFile(name, type, raw) {
    var self = this;
    
    self.name = name;
    self.type = type;
    self.raw = raw;
    self.embed = false;
    self.valid = false;
    self.parsed = null;
    
    self.evaluate();
}
DataFile.prototype.evaluate = function () {
    var self = this,
        temp;
    self.parsed = null;
    self.valid = false;
    
    try {
        if (self.type === 'text/js') {
            self.parsed = eval(self.raw);
            temp = typeof self.parsed;
            if (temp !== "object" || self.parsed === null) {
                temp = "The script generated an invalid object of type " + temp +
                       " and value " + String(self.parsed) + ". You should end the " +
                       "script with an object or array followed by a semicolon.";
                self.parsed = null;
                throw new Error(temp);
            }
        } else if (self.type === 'text/json') {
            self.parsed = JSON.parse(self.raw);
        } else if (self.type === 'text/csv') {
            self.parsed = ed3.csv.parse(self.raw);
        } else if (self.type === 'text/tab-separated-values') {
            self.parsed = ed3.tsv.parse(self.raw);
        } else {
            throw new Error("Attempted to parse unsupported data type: " + self.type);
        }
        self.valid = true;
    } catch(e) {
        self.parsed = {"error_type" : e.name};
        self.parsed["ERROR: Couldn't parse " + self.name + " as " + self.type] = e.stack.split('\n');
    }
};

function OrphanFile () {
    DataFile.call(this, 'default', 'text/json', '{}');
    var self = this;
    
    self.embed = true;
}
OrphanFile.prototype = Object.create(DataFile.prototype);
OrphanFile.prototype.constructor = OrphanFile;






function DataManager() {
    var self = this;
    
    self.allFiles = [];
    self.fileLookup = {};
    
    self.currentFile = undefined;
    
    self.typingTimer = undefined;
}

DataManager.SUPPORTED_FORMATS = [
    'text/csv',
    'text/tab-separated-values',
    'text/json',
    'text/js'
];
DataManager.FRIENDLY_FORMAT_NAMES = {
    'text/csv' : 'csv',
    'text/tab-separated-values' : 'tsv',
    'text/json': 'json',
    'text/js' : 'js'
};
DataManager.FORMAT_LOOKUP = {
    'text/csv' : 'text/csv',
    'text/tab-separated-values' : 'text/tab-separated-values',
    'text/json' : 'text/json',
    'text/js' : 'text/js',
    'csv' : 'text/csv',
    'tsv' : 'text/tab-separated-values',
    'json' : 'text/json',
    'js' : 'text/js',
    'text/tsv' : 'text/tab-separated-values',
    'application/json' : 'text/json',
    'application/js' : 'text/js'
};
DataManager.prototype.init = function () {
    var self = this;
    self.addFile(new OrphanFile());
    self.currentFile = self.allFiles[0].name;
    self.updatePanel();
};
DataManager.prototype.updatePanel = function () {
    var self = this,
        i, f,
        currentDataFile = ejQuery('#currentDataFile'),
        editor = ejQuery('#dataTextEditor'),
        //embedBox = ejQuery('#embedFileCheckBox'),
        dataTypeSelect = ejQuery('#dataTypeSelect'),
        optionText = "";
    
    // Inject a fresh invisible file uploading control
    ejQuery('#dataFileInput').remove();
    ejQuery('#dataEditorControls').append('<input id="dataFileInput" type="file" onchange="DATA.loadFiles();" multiple style="visibility:hidden"/>');
    
    // Update the visible controls (rebuild the file selection menu from scratch)
    currentDataFile.find('option').remove();
    
    for (i = 0; i < self.allFiles.length; i += 1) {
        f = self.allFiles[i];
        optionText = '<option value="' + f.name + '"';
        
        if (self.currentFile === f.name) {
            optionText += ' selected';
            editor.val(f.raw);
            //embedBox.prop('disabled', f instanceof OrphanFile);
            //embedBox.prop('checked', true);
            //dataTypeSelect.prop('disabled', false);
            dataTypeSelect.val(f.type);
        }
        optionText += '>' + f.name + '</option>';
        currentDataFile.append(optionText);
    }
    
    currentDataFile.append('<option value="loadNewFile">Load...</option>');
};
DataManager.prototype.edit = function () {
    var self = this,
        f = self.getFile(self.currentFile);
    clearTimeout(self.typingTimer);
    self.typingTimer = setTimeout(function () {
        f.raw = ejQuery('#dataTextEditor').val();
        EXTENSION.notifyNewData();
    }, TYPING_INTERVAL);
};
DataManager.prototype.switchFile = function () {
    var self = this,
        newFile = ejQuery('#currentDataFile').val();
    
    if (newFile === 'loadNewFile') {
        // It will take a while for the user to pick some files, so for now,
        // revert back to the previous file in case they don't pick anything
        // that we can load (the loading and panel updating will be fired by
        // dataFileInput's onchange):
        ejQuery('#currentDataFile').val(self.currentFile);
        ejQuery('#dataFileInput').click();
    } else {
        self.currentFile = newFile;
        self.updatePanel();
    }
};
DataManager.prototype.changeEmbed = function () {
    var self = this;
    self.getFile(self.currentFile).embed = ejQuery('#embedFileCheckBox').prop('checked');
    self.updatePanel();
};
DataManager.prototype.changeType = function () {
    var self = this,
        current = self.getFile(self.currentFile),
        newType = ejQuery('#dataTypeSelect').val();
    current.type = newType;
    self.updatePanel();
    EXTENSION.notifyNewData();
};
DataManager.prototype.addFile = function(newFile) {
    var self = this;
    
    if (self.fileLookup.hasOwnProperty(newFile.name)) {
        self.allFiles[self.fileLookup[newFile.name]] = newFile;
    } else {
        self.fileLookup[newFile.name] = self.allFiles.length;
        self.allFiles.push(newFile);
    }
};
DataManager.prototype.hasFile = function(fileName) {
    var self = this;
    return self.fileLookup.hasOwnProperty(fileName);
};
DataManager.prototype.getFile = function(fileName) {
    var self = this;
    return self.allFiles[self.fileLookup[fileName]];
};
DataManager.prototype.loadSampleDataFile = function (url) {
    var self = this;
    ejQuery.get(url, function (dataString) {
        var parts = url.split('/'),
            name = parts[parts.length - 1],
            extension = name.split('.');
        
        extension = extension[extension.length - 1];
        extension = DataManager.FORMAT_LOOKUP[extension.toLowerCase()];
        if (typeof dataString !== 'string') {
            dataString = JSON.stringify(dataString);
        }
        self.addFile(new DataFile(name, extension, dataString));
        self.currentFile = name;
        self.updatePanel();
        EXTENSION.notifyNewData();
        EXTENSION.displayMessage('Loaded ' + name);
    });
};
DataManager.prototype.loadFile = function (f) {
    var self = this,
        fileReader = new FileReader();
    fileReader.onload = function (e) {
        self.addFile(new DataFile(f.name, DataManager.FORMAT_LOOKUP[f.type], e.target.result));
    };
    fileReader.readAsText(f);
};
DataManager.prototype.loadFiles = function () {
    var self = this,
        newFiles = ejQuery('#dataFileInput')[0].files,
        i,
        j,
        warningText,
        warnedAboutFiles = false,
        unloadedFiles = [],
        lastFile = self.currentFile;
    
    for (i = 0; i < newFiles.length; i += 1) {
        if (DataManager.FORMAT_LOOKUP.hasOwnProperty(newFiles[i].type) === false) {
            if (warnedAboutFiles === false) {
                warningText = "Sorry, hanpuku does not support " + newFiles[i].type + ". It only supports ";
                for (j = 0; j < DataManager.SUPPORTED_FORMATS.length; j += 1) {
                    if (j !== 0) {
                        warningText += ', ';
                    }
                    if (j === DataManager.SUPPORTED_FORMATS.length-1) {
                        warningText += 'and ';
                    }
                    warningText += DataManager.FRIENDLY_FORMAT_NAMES[DataManager.SUPPORTED_FORMATS[j]];
                }
                warningText += " data files.";
                alert(warningText);
                warnedAboutFiles = true;
            }
        } else {
            unloadedFiles.push(newFiles[i].name);
            self.loadFile(newFiles[i]);
            if (self.currentFile === lastFile) {
                // Set the current file to the first one that loads
                self.currentFile = newFiles[i].name;
            }
        }
    }
    // Update the panel when all the files have finished loading
    function updateWhenLoaded() {
        var f;
        for (f = 0; f < self.allFiles.length; f += 1) {
            if (unloadedFiles.indexOf(self.allFiles[f].name) !== -1) {
                unloadedFiles.splice(unloadedFiles.indexOf(self.allFiles[f].name),1);
            }
        }
        // TODO: add a spinner?
        if (unloadedFiles.length > 0) {
            window.setTimeout(updateWhenLoaded, 200);
        } else {
            self.updatePanel();
            EXTENSION.notifyNewData();
        }
    }
    updateWhenLoaded();
};