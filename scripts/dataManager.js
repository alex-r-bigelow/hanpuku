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
    var self = this;
    self.parsed = null;
    self.valid = false;
    
    try {
        if (self.type === 'text/js') {
            self.parsed = eval(self.raw);
        } else if (self.type === 'text/json') {
            self.parsed = JSON.parse(self.raw);
        } else if (self.type === 'text/csv') {
            self.parsed = d3._csv.parse(self.raw);
        } else if (self.type === 'text/tab-separated-values') {
            self.parsed = d3._tsv.parse(self.raw);
        } else {
            throw new Error("Attempted to parse unsupported data type: " + self.type);
        }
        self.valid = true;
    } catch(e) {
        self.parsed = {};
        self.parsed["ERROR: Couldn't parse " + self.name + " as " + self.type] = e.stack.split('\n');
    }
};

function OrphanFile () {
    DataFile.call(this, 'default.json', 'text/json', '{}');
    var self = this;
    
    self.embed = true;
}
OrphanFile.prototype = Object.create(DataFile.prototype);
OrphanFile.prototype.constructor = OrphanFile;

function PreviewDatum (key, name, data, depth) {
    var self = this,
        keyPrefix = key,
        child;
    
    self.bindable = !(data instanceof DataFile || depth === 0);
    self.isError = false;
    self.key = key;
    self.name = name;
    self.depth = depth;
    self.children = null;
    self._children = null;
    
    //self.id = self.key + JSON.stringify(data);  // TODO: is there a better way to do this?
        
    if (data instanceof DataFile) {
        keyPrefix += '.parsed';
        self.isError = !data.valid;
        self.name = data.name;
        data = data.parsed;
    }
    
    if (typeof data === 'object') {
        if (data instanceof Array) {
            self.objType = PreviewDatum.ARRAY;
            self._children = [];
            for (child = 0; child < data.length; child += 1) {
                self._children.push(new PreviewDatum(keyPrefix + '[' + child + ']', child, data[child], self.depth + 1));
            }
        } else {
            self.objType = PreviewDatum.OBJECT;
            self._children = {};
            for (child in data) {
                if (data.hasOwnProperty(child)) {
                    self._children[child] = new PreviewDatum(keyPrefix + '["' + child + '"]', child, data[child], self.depth + 1);
                }
            }
        }
    } else {
        self.objType = PreviewDatum.NATIVE;
    }
}
PreviewDatum.ARRAY = 0;
PreviewDatum.OBJECT = 1;
PreviewDatum.NATIVE = 2;

PreviewDatum.VISIBLE_DATA = [];
PreviewDatum.VISIBLE_LOOKUP = {};
PreviewDatum.ALL_DATA = []; // Store the PreviewDatum objects themselves here; everything else is just an index into this array
PreviewDatum.ALL_LOOKUP = {};
PreviewDatum.TREE = null;

PreviewDatum.NEW_VISIBLE_DATA = null;
PreviewDatum.NEW_VISIBLE_LOOKUP = null;
PreviewDatum.NEW_LOOKUP = null;
PreviewDatum.NEW_DATA = null;
PreviewDatum.NEW_TREE = null;

PreviewDatum.GET_BY_VISIBLE_INDEX = function (i) {
    return PreviewDatum.ALL_DATA[PreviewDatum.VISIBLE_DATA[i]];
};
PreviewDatum.GET_BY_INDEX = function (i) {
    return PreviewDatum.ALL_DATA[i];
};
PreviewDatum.HAS_KEY = function (k) {
    return PreviewDatum.ALL_LOOKUP.hasOwnProperty(k);
};
PreviewDatum.GET_BY_KEY = function (k) {
    return PreviewDatum.ALL_DATA[PreviewDatum.ALL_LOOKUP[k]];
};
PreviewDatum.KEY_IS_VISIBLE = function (k) {
    return PreviewDatum.VISIBLE_LOOKUP.hasOwnProperty(k);
};
PreviewDatum.prototype.getValue = function () {
    return eval(this.key);
};

PreviewDatum.UPDATE = function (allFiles) {
    // First construct the new tree
    PreviewDatum.NEW_TREE = new PreviewDatum('DATA.allFiles', 'Loaded Files', allFiles, 0);
    PreviewDatum.NEW_VISIBLE_DATA = [];
    PreviewDatum.NEW_VISIBLE_LOOKUP = {};
    PreviewDatum.NEW_DATA = [];
    PreviewDatum.NEW_LOOKUP = {};
    
    // Preserve collapsed status, get new NEW_DATA indices
    PreviewDatum.NEW_TREE.populateNew(true);
    
    // Clean up:
    PreviewDatum.TREE = PreviewDatum.NEW_TREE;
    PreviewDatum.VISIBLE_DATA = PreviewDatum.NEW_VISIBLE_DATA;
    PreviewDatum.VISIBLE_LOOKUP = PreviewDatum.NEW_VISIBLE_LOOKUP;
    PreviewDatum.ALL_DATA = PreviewDatum.NEW_DATA;
    PreviewDatum.ALL_LOOKUP = PreviewDatum.NEW_LOOKUP;
    
    PreviewDatum.NEW_TREE = null;
    PreviewDatum.NEW_VISIBLE_DATA = null;
    PreviewDatum.NEW_VISIBLE_LOOKUP = null;
    PreviewDatum.NEW_DATA = null;
    PreviewDatum.NEW_LOOKUP = null;
};
PreviewDatum.prototype.populateNew = function (append) {
    var self = this,
        oldDatum,
        children,
        appendChildren,
        child;
    
    // Try to preserve expanded / collapsed status
    if (PreviewDatum.HAS_KEY(self.key)) {
        oldDatum = PreviewDatum.GET_BY_KEY(self.key);
        // I was (probably) in the old dataset; match the old status
        if (oldDatum.children !== null && self.children === null) {   // need to expand
            self.toggleCollapse();
        } else if (oldDatum._children !== null && self._children === null) {    // need to collapse
            self.toggleCollapse();
        }
    }
    
    PreviewDatum.NEW_LOOKUP[self.key] = PreviewDatum.NEW_DATA.length;
    if (append === true) {
        // If my ancestors were all expanded, I need to add myself to NEW_DATA
        PreviewDatum.NEW_VISIBLE_LOOKUP[self.key] = PreviewDatum.NEW_VISIBLE_DATA.length;
        PreviewDatum.NEW_VISIBLE_DATA.push(PreviewDatum.NEW_DATA.length);
    } else {
        // Otherwise, I need to point to whatever ancestor was last added
        PreviewDatum.NEW_VISIBLE_LOOKUP[self.key] = PreviewDatum.NEW_VISIBLE_DATA.length - 1;
    }
    PreviewDatum.NEW_DATA.push(self);
    
    // Finally, populate my children
    appendChildren = self.children !== null;
    children = appendChildren ? self.children : self._children;
    
    if (self.objType === PreviewDatum.ARRAY) {
        for (child = 0; child < children.length; child += 1) {
            children[child].populateNew(append && appendChildren);
        }
    } else if (self.objType === PreviewDatum.OBJECT) {
        for (child in children) {
            if (children.hasOwnProperty(child)) {
                children[child].populateNew(append && appendChildren);
            }
        }
    }
};
PreviewDatum.prototype.toggleCollapse = function () {
    var self = this,
        temp = self.children;
    self.children = self._children;
    self._children = temp;
};

function DataManager() {
    var self = this;
    
    self.allFiles = [];
    self.fileLookup = {};
    
    self.addFile(new OrphanFile());
    
    self.currentFile = self.allFiles[0].name;
    self.showSelection = false;
    
    self.typingTimer = undefined;
    
    self.updatePanel();
}
DataManager.BAR_SIZE = 20;
DataManager.X_WIDTH = 0.55; // the max aspect ratio for common monospace fonts
DataManager.LINK_GAP = 100;
DataManager.ERROR_COLOR = '#f00';

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
DataManager.prototype.render = function () {
    var self = this,
        svg,
        svgEnter,
        graphicsList,
        mappingOverlay,
        dataList,
        left = 0,
        width = DataManager.BAR_SIZE,
        height = 0,
        nodes,
        nodeEnter;
        
    svg = ed3.select('#dataPreview').selectAll('svg');
    
    // Set up our svg and its groups on the first pass
    svgEnter = svg.data([0]).enter().append('svg');
    svgEnter.append('g').attr('class','graphicsList');
    svgEnter.append('g').attr('class','dataList');
    svgEnter.append('g').attr('class','mappingOverlay');
    
    graphicsList = svg.select('.graphicsList');
    dataList = svg.select('.dataList');
    mappingOverlay = svg.select('.mappingOverlay');  // Needs to be on top
    
    // Prep all the vertical node positions
    PreviewDatum.UPDATE(self.allFiles);
    height = (PreviewDatum.VISIBLE_DATA.length + 1) * DataManager.BAR_SIZE;
    
    // Draw the selection list
    if (self.showSelection === true) {
        nodes = graphicsList.selectAll('.selectionItems').data(SELECTED_IDS, function (d) { return d; });
        
        // Enter
        var iconPadding = DataManager.BAR_SIZE / 8;
        nodeEnter = nodes.enter().append('g');
        nodeEnter.append('text')
            .attr('font-family', '"Consolas", monospace')
            .attr('font-size', EXTENSION.fontSize)
            .attr('dy', 3 * DataManager.BAR_SIZE / 4)
            .attr('dx', DataManager.BAR_SIZE);
        nodeEnter.append('rect')
            .attr('x', iconPadding)
            .attr('y', iconPadding)
            .attr('width', DataManager.BAR_SIZE - 2*iconPadding)
            .attr('height', DataManager.BAR_SIZE - 2*iconPadding)
            .attr('fill', '#fff')
            .attr('stroke', '#000');
        nodeEnter.appendClone(function (d) { return d; })
            .setGlobalBBox(iconPadding * 2, iconPadding * 2,
                           DataManager.BAR_SIZE - 4 * iconPadding,
                           DataManager.BAR_SIZE - 4 * iconPadding);
        
        // Exit
        nodes.exit().remove();
        
        // Update
        nodes.attr('transform', function (d, i) {
            return 'translate(0,' + (i * DataManager.BAR_SIZE) + ')';   // TODO: set the y-transform based on PreviewDatum
        });
        nodes.selectAll('text').text(function (d) {
            var nodeWidth = d.length * DataManager.X_WIDTH * EXTENSION.fontSize;
            if (left < nodeWidth) {
                left = nodeWidth;
            }
            return d;
        }).attr('fill', EXTENSION.textColor);
        
        
        // TODO: draw the link overlay
        
        width = left + DataManager.LINK_GAP;
    }
    
    // Draw the data
    dataList.attr('transform', 'translate(' + width + ',0)');
    nodes = dataList.selectAll('.dataNode').data(PreviewDatum.VISIBLE_DATA, function (d) { return PreviewDatum.GET_BY_INDEX(d).key; });
    
    // Enter
    nodeEnter = nodes.enter().append('g')
        .attr('class','dataNode');
    nodeEnter.append('text')
        .attr('font-family', '"Consolas", monospace')
        .attr('font-size', EXTENSION.fontSize)
        .attr('dy', 3 * DataManager.BAR_SIZE / 4)
        .attr('dx', DataManager.BAR_SIZE / 2);
        
    var controlRadius = DataManager.BAR_SIZE / 6;
    var bindEnter = nodeEnter.filter(function (d) {
        return d.bindable === true;
    });
    bindEnter.append('circle')
        .attr('class', 'binding')
        .attr('cx', 0)
        .attr('cy', DataManager.BAR_SIZE / 2)
        .attr('r', controlRadius);
    var collapseEnter = nodeEnter.filter(function (i) {
        var d = PreviewDatum.GET_BY_INDEX(i);
        return d.children !== null || d._children !== null;
    }).append('path');
    collapseEnter.attr('class', 'expansion')
                 .attr('d', 'M' + (-controlRadius) + ',' + (-controlRadius) +
                            'L' + controlRadius + ',0' +
                            'L' + (-controlRadius) + ',' + controlRadius + 'Z')
                 .on('click', function (i) {
                    PreviewDatum.GET_BY_INDEX(i).toggleCollapse();
                    self.render();
                 });
    
    // Exit
    nodes.exit().remove();
    
    // Update
    nodes.attr('transform',function (i, j) {
        var d = PreviewDatum.GET_BY_INDEX(i);
        return 'translate(' + (d.depth * DataManager.BAR_SIZE) + ',' + j * DataManager.BAR_SIZE + ')';
    });
    nodes.selectAll('.binding')
        .attr('stroke', EXTENSION.textColor)
        .attr('fill', EXTENSION.textColor)
        .attr('fill-opacity', 0.1);
    nodes.selectAll('.expansion')
        .attr('transform', function (i) {
            var d = PreviewDatum.GET_BY_INDEX(i);
            if (d.children === null) {
                return 'matrix(1,0,0,1,0,' + DataManager.BAR_SIZE + ')'; // just translate, don't rotate
            } else {
                return 'matrix(0,1,-1,0,0,' + DataManager.BAR_SIZE + ')'; // rotate, then translate
            }
        })
        .attr('fill', EXTENSION.textColor);
    nodes.selectAll('text').text(function (i) {
        var d = PreviewDatum.GET_BY_INDEX(i),
            result = d.name;
        if (d.isError === true) {
            result += " : PARSING ERROR!";
        } else if (d.depth !== 0) {
            result += " : ";
            if (d.objType === PreviewDatum.NATIVE) {
                result += d.getValue();
            } else if (d.objType === PreviewDatum.ARRAY) {
                result += '[';
                if (d.children === null) {
                    result += d._children.length;
                } else {
                    result += d.children.length;
                }
                result += ']';
            } else {
                result += '{';
                if (d.children === null) {
                    result += Object.keys(d._children).length;
                } else {
                    result += Object.keys(d.children).length;
                }
                result += '}';
            }
        }
        // We want to auto-adjust the data group width by the widest, deepest node...
        var nodeWidth = left + (d.depth + 1) * DataManager.BAR_SIZE + (result.length+1) * DataManager.X_WIDTH * EXTENSION.fontSize;
        if (width < nodeWidth) {
            width = nodeWidth;
        }
        return result;
    }).attr('fill', function (i) {
        if (PreviewDatum.GET_BY_INDEX(i).isError === false) {
            return EXTENSION.textColor;
        } else {
            return DataManager.ERROR_COLOR;
        }
    });
    
    svg.attr('width', width)
       .attr('height', height);
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
            dataTypeSelect.prop('disabled', f instanceof OrphanFile);
            dataTypeSelect.val(f.type);
        }
        optionText += '>' + f.name + '</option>';
        currentDataFile.append(optionText);
    }
    
    currentDataFile.append('<option value="loadNewFile">Load...</option>');
    
    self.render();
};
DataManager.prototype.edit = function () {
    var self = this,
        f = self.getFile(self.currentFile);
    clearTimeout(self.typingTimer);
    self.typingTimer = setTimeout(function () {
        f.raw = ejQuery('#dataTextEditor').val();
        f.evaluate();
        self.render();
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
    self.getFile(self.currentFile).embed = jQuery('#embedFileCheckBox').prop('checked');
    self.updatePanel();
};
DataManager.prototype.changeType = function () {
    var self = this,
        current = self.getFile(self.currentFile),
        newType = jQuery('#dataTypeSelect').val();
    current.type = newType;
    current.evaluate();
    self.updatePanel();
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
        
        self.addFile(new DataFile(name, extension, dataString));
        self.currentFile = name;
        self.updatePanel();
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
                warningText = "Sorry, iD3 does not support " + newFiles[i].type + ". It only supports ";
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
        }
    }
    updateWhenLoaded();
};