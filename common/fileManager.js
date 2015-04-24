/*jslint evil:true */
/*globals window, d3, ace, console, confirm, prompt*/
function DO_NOTHING() {
    "use strict";
}

function File(name, format, role, path) {
    "use strict";
    var self = this;
    
    self.path = path === undefined ? File.EMBEDDED : path;
    self.name = name;
    self.raw = "";
    self.format = format;
    self.role = role;
    
    self.parsed = null;
    self.valid = null;  // generally true/false; null means we haven't evaluated yet
    self.saved = false;
    
    if (path !== undefined) {
        self.read();
    } else {
        self.write();
    }
}
File.EMBEDDED = {};
File.FORMAT_LOOKUP = {
    'text/csv' : 'csv',
    'text/tab-separated-values' : 'tsv',
    'text/json' : 'json',
    'text/js' : 'js',
    'text/xml' : 'xml',
    'text/html' : 'html',
    'csv' : 'csv',
    'tsv' : 'tsv',
    'json' : 'json',
    'js' : 'js',
    'text' : 'txt',
    'txt' : 'txt',
    'xml' : 'xml',
    'html' : 'html',
    'text/tsv' : 'tsv',
    'application/json' : 'json',
    'application/js' : 'js'
};
File.prototype.onUpdate = DO_NOTHING;
File.prototype.onRemove = DO_NOTHING;
File.prototype.onFormatChange = DO_NOTHING;

File.prototype.evaluate = function () {
    "use strict";
    // override this if dealing with code (this is the default for evaluating
    // data files)
    var self = this,
        temp;
    self.parsed = null;
    self.valid = null;
    
    try {
        if (self.format === 'js') {
            self.parsed = eval(self.raw);
            temp = typeof self.parsed;
            if (temp !== "object" || self.parsed === null) {
                temp = "The script generates an invalid object of type " + temp +
                       " and value " + String(self.parsed) + ". You should end the " +
                       "script with an object or array followed by a semicolon.";
                self.parsed = null;
                throw new Error(temp);
            }
        } else if (self.format === 'json') {
            self.parsed = JSON.parse(self.raw);
        } else if (self.format === 'csv') {
            self.parsed = d3.csv.parse(self.raw);
        } else if (self.format === 'tsv') {
            self.parsed = d3.tsv.parse(self.raw);
        } else {
            throw new Error("Attempted to parse unsupported data type: " + self.type);
        }
        self.valid = true;
    } catch (e) {
        self.parsed = {"error_type" : e.name};
        self.parsed["ERROR: Couldn't parse " + self.name + " as " + self.type] = e.stack.split('\n');
        self.valid = false;
    }
    self.onUpdate();
};
File.prototype.setText = function (contents) {
    "use strict";
    var self = this;
    if (self.raw !== contents) {
        self.saved = false;
        self.parsed = null;
        self.valid = null;
        self.raw = contents;
        self.onUpdate();
    }
};
File.prototype.write = function () {
    "use strict";
    var self = this,
        result,
        finish = function () {
            self.saved = true;
            self.onUpdate();
        };
    
    if (self.path === File.EMBEDDED) {
        window.illustrator.callFunction('writeEmbeddedFile', [self.role, self.name, self.raw], finish);
    } else {
        result = window.cep.fs.writeFile(self.path, self.raw);
        if (result.err !== 0) {
            throw "Could not write to linked file " + self.path;
        }
        finish();
    }
};
File.prototype.read = function () {
    "use strict";
    var self = this,
        result,
        finish = function (contents) {
            self.saved = true;  // file contents are consistent with what is on disk
            if (self.raw !== contents.data) {
                self.parsed = null;
                self.valid = null;
                self.raw = contents.data;
                self.onUpdate();
            }
        };
    
    if (self.path === File.EMBEDDED) {
        window.illustrator.callFunction('readEmbeddedFile', [self.role, self.name], finish);
    } else {
        result = window.cep.fs.stat(self.path);
        if (result.err !== 0 || (!result.data.isFile())) {
            throw "Could not read linked file " + self.path;
        } else {
            finish(window.cep.fs.readFile(self.path));
        }
    }
    
};
File.prototype.remove = function () {
    "use strict";
    var self = this,
        answer,
        result;
    
    if (self.path === File.EMBEDDED) {
        answer = confirm("Are you sure you want to delete " + self.name + "?");
        if (answer === true) {
            window.illustrator.callFunction('deleteEmbeddedFile', [self.role, self.name], self.onRemove);
        }
    } else {
        answer = confirm("Are you sure you want to delete " + self.name + "?" +
                        "\n\nThis will also delete the file on disk (uncheck \"Save Externally\" first" +
                        " to only remove the reference).");
        if (answer === true) {
            window.illustrator.callFunction('removeLinkedFile', [self.role, self.name], function () {
                result = window.cep.fs.deleteFile(self.path);
                if (result === 0) {
                    throw "Could not delete linked file " + self.path;
                }
                self.onRemove();
            });
        }
    }
};
File.prototype.saveAs = function () {
    "use strict";
    var self = this,
        result,
        initialPath,
        newPath,
        finish = function () {
            // Fix our variables
            self.path = newPath.data;
            self.name = newPath.data.split('/');
            self.name = self.name[self.name.length - 1];
            self.name = self.name.split('.');
            self.format = File.FORMAT_LOOKUP[self.name.splice(-1)[0]];
            self.name = self.name.join('.');
            self.saved = true;
            self.onUpdate();
        };
    initialPath = self.path === File.EMBEDDED ? undefined : self.path;
    newPath = window.cep.fs.showSaveDialogEx("Save As",
                                             initialPath,
                                             [self.format],
                                             self.name,
                                             self.role + " files",
                                             "Save",
                                             "Save As");
    if (newPath.data === "") {
        self.onUpdate();
        return;
    }
    
    // First make sure we can actually create the file
    result = window.cep.fs.writeFile(newPath.data, self.raw);
    if (result.err !== 0) {
        throw "Could not write to linked file " + newPath;
    }
    
    // Add the link to the external file
    window.illustrator.callFunction('addLinkedFile', [self.role, self.name, newPath.data], function () {
        // Clean up whatever references we left behind
        if (self.path === File.EMBEDDED) {
            window.illustrator.callFunction('deleteEmbeddedFile', [self.role, self.name], finish);
        } else {
            window.illustrator.callFunction('removeLinkedFile', [self.role, self.name], finish);
        }
    });
};
File.prototype.rename = function () {
    "use strict";
    var self = this,
        newName,
        newPath,
        answer;
    
    if (self.path === File.EMBEDDED) {
        newName = prompt("Enter the new file name:", self.name);
        if (newName !== null) {
            window.illustrator.callFunction('fileExists', [self.role, newName], function (exists) {
                if (exists) {
                    throw "Can't rename: file " + newName + " already exists";
                }
                window.illustrator.callFunction('deleteEmbeddedFile', [self.role, self.name], function () {
                    self.name = newName;
                    self.write();
                });
            });
        }
    } else {
        newName = prompt("Enter the new file name:" +
                        "\n\nThis will also rename the file on disk (uncheck \"Save Externally\" first" +
                        " to only rename the reference).", self.name);
        if (newName !== null) {
            newPath = self.path.split('/');
            newPath.splice(-1);
            newPath.push(newName + '.' + self.format);
            newPath = newPath.join('/');
            window.illustrator.callFunction('fileExists', [self.role, newName], function (exists) {
                if (!exists) {
                    throw "Can't rename: file " + newName + " already exists";
                }
                if (window.cep.fs.stat(newPath).err !== 0) {
                    answer = confirm(newName + '.' + self.format + ' already exists. Overwrite?');
                    if (answer === false) {
                        return;
                    }
                }
                self.name = newName;
                self.path = newPath;
                self.write();
            });
        }
    }
};
File.prototype.toggleEmbedded = function () {
    "use strict";
    var self = this;
    
    if (self.path === File.EMBEDDED) {
        self.saveAs();
    } else {
        window.illustrator.callFunction('writeEmbeddedFile', [self.role, self.name, self.raw], function () {
            window.illustrator.callFunction('deleteLinkedFile', [self.role, self.name], function () {
                self.path = File.EMBEDDED;
                self.onUpdate();
            });
        });
    }
};
File.prototype.setFormat = function (newFormat) {
    "use strict";
    var self = this;
    if (self.format !== newFormat) {
        self.format = newFormat;
        self.parsed = null;
        self.valid = null;
        self.onFormatChange();
    }
};
File.prototype.isEmbedded = function () {
    "use strict";
    var self = this;
    return self.path === File.EMBEDDED;
};




function FileManager(placeholderId, roleName, validFormats) {
    "use strict";
    var self = this;
    
    self.files = {};
    self.roleName = roleName;
    self.validFormats = validFormats;
    
    self.currentFile = null;
    
    self.editor = ace.edit(placeholderId);
    self.editor.$blockScrolling = Infinity;
    self.editor.getSession().setMode("ace/mode/text");
    window.illustrator.aceEditors.push(self.editor);    // let Illustrator set the theme
}
FileManager.TYPING_DELAY = 20000;
FileManager.EDITOR_SETTINGS = {
    'css' : {
        'mode' : 'ace/mode/css'
    },
    'js' : {
        'mode' : 'ace/mode/javascript'
    },
    'csv' : {
        'mode' : 'ace/mode/text'
    },
    'txt' : {
        'mode' : 'ace/mode/text'
    },
    'tsv' : {
        'mode' : 'ace/mode/text'
    },
    'json' : {
        'mode' : 'ace/mode/json'
    },
    'xml' : {
        'mode' : 'ace/mode/xml'
    },
    'html' : {
        'mode' : 'ace/mode/html'
    }
};
FileManager.prototype.onUpdate = DO_NOTHING;

FileManager.prototype.switchFile = function (fileName) {
    "use strict";
    var self = this;
    
    if (self.currentFile !== null) {
        // remove event handlers from the old currentFile
        self.currentFile.onUpdate = DO_NOTHING;
        self.currentFile.onSave = DO_NOTHING;
        self.currentFile.onFormatChange = DO_NOTHING;
        self.currentFile.onRemove = DO_NOTHING;
        self.currentFile.onEvaluate = DO_NOTHING;
    }
    
    if (fileName === null) {
        self.currentFile = null;
        self.editor.setValue("");
        self.editor.setReadOnly(true);
    } else {
        self.currentFile = self.files[fileName];
        self.editor.setValue(self.currentFile.raw);
        self.editor.setReadOnly(false);
        self.updateFormat();
        
        // add event handlers to the new currentFile
        self.currentFile.onUpdate = self.onUpdate;
        self.currentFile.onSave = self.onUpdate;
        self.currentFile.onFormatChange = function () { self.updateFormat(); };
        self.currentFile.onRemove = function () { self.remove(); };
        self.currentFile.onEvaluate = self.onUpdate;
    }
    
    self.onUpdate();
};

FileManager.prototype.refreshFiles = function () {
    "use strict";
    var self = this;
    window.illustrator.callFunction('getFileList', ['data'], function (fileList) {
        var foundFiles = {},
            arbitraryFile = null,
            f;
        for (f = 0; f < fileList.length; f += 1) {
            if (self.files.hasOwnProperty(fileList[f].name)) {
                arbitraryFile = fileList[f].name;
                // there's a match...
                // TODO: ask whether to refresh if the actual file has changed
            } else {
                if (fileList[f].embedded === true) {
                    // embedded exists, no list entry exists (just read it)
                    self.loadEmbeddedFile(fileList[f].name);
                } else {
                    // link exists, no list entry exists (just open it)
                    window.illustrator.callFunction('getFileLink', [fileList[f].name, 'data'], function (path) {
                        self.loadLinkedFile(path, fileList[f].name);
                    });
                }
                arbitraryFile = fileList[f].name;
            }
            foundFiles[fileList[f].name] = true;
        }
        for (f in self.files) {
            if (self.files.hasOwnProperty(f) && !foundFiles.hasOwnProperty(f)) {
                // no link / embedded file exists, but a list entry exists (mark as unsaved)
                self.files.saved = false;
                foundFiles[f] = false;
                arbitraryFile = f;
            }
        }
        
        if (self.currentFile === null && arbitraryFile !== null) {
            self.switchFile(arbitraryFile);
        } else if (arbitraryFile === null) {
            self.switchFile(arbitraryFile);
        }

        self.onUpdate();
    });
};

FileManager.prototype.loadEmbeddedFile = function (fileName) {
    "use strict";
    var self = this,
        newFile = new File(fileName, 'txt', self.roleName);
    newFile.read();
    self.files[fileName] = newFile;
};
FileManager.prototype.loadLinkedFile = function (path, fileName) {
    "use strict";
    var self = this,
        temp = path.split('/'),
        format,
        newFile;
    
    temp = temp[temp.length - 1].split('.');
    format = File.FORMAT_LOOKUP[temp.splice(-1)];
    fileName = fileName === undefined ? temp.join('.') : fileName;
    
    newFile = new File(fileName, format, self.roleName, path);
    
    // Add a link to the external file
    window.illustrator.callFunction('addLinkedFile', [self.roleName, fileName, path]);
    
    self.files[fileName] = newFile;
    
    return fileName;
};

FileManager.prototype.remove = function () {
    "use strict";
    var self = this,
        fileNames = Object.keys(self.files),
        index = fileNames.indexOf(self.currentFile.name);
    delete self.files[self.currentFile.name];
    if (fileNames.length <= 1) {
        self.switchFile(null);
    } else {
        index = index === 0 ? 0 : index - 1;
        self.switchFile(fileNames[index]);
    }
};
FileManager.prototype.updateFormat = function () {
    "use strict";
    var self = this;
    self.editor.getSession().setMode(FileManager.EDITOR_SETTINGS[self.currentFile.format].mode);
};


FileManager.prototype.newFile = function () {
    "use strict";
    var self = this,
        fileName = prompt('New file name:');
    while (fileName !== null  && self.files.hasOwnProperty(fileName)) {
        fileName = prompt(fileName + ' already exists; pick a new name', fileName + ' copy');
    }
    
    if (fileName !== null) {
        self.files[fileName] = new File(fileName, 'txt', self.roleName);
        self.switchFile(fileName);
    }
};
FileManager.prototype.openFile = function () {
    "use strict";
    var self = this,
        result = window.cep.fs.showOpenDialogEx(false,
                                                false,
                                                'Open',
                                                undefined,
                                                self.validFormats,
                                                self.roleName + ' files',
                                                'Open');
    if (result.data.length > 0) {
        self.switchFile(self.loadLinkedFile(result.data[0]));
    }
};
FileManager.prototype.saveFile = function () {
    "use strict";
    var self = this;
    self.currentFile.write();
};
FileManager.prototype.saveFileAs = function () {
    "use strict";
    var self = this;
    self.currentFile.saveAs();
};
FileManager.prototype.deleteFile = function () {
    "use strict";
    var self = this;
    self.currentFile.remove();
};
FileManager.prototype.renameFile = function () {
    "use strict";
    var self = this;
    self.currentFile.rename();
};
FileManager.prototype.refreshFile = function () {
    "use strict";
    var self = this;
    self.currentFile.read();
};
FileManager.prototype.search = function () {
    "use strict";
    var self = this;
    self.editor.execCommand("find");
};