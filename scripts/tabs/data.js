/*jslint evil:true*/
var BAR_SIZE = 20,
    FONT_SIZE = 12,
    CHAR_WIDTH = 8,
    LINK_GAP = 100;

function ParseNode(key, data, depth, flag) {
    var self = this,
        child;
    
    if (!depth) {
        depth = 0;
    }
    
    self.nodeID = ParseNode.NUM_NODES;
    ParseNode.NUM_NODES += 1;
    self.key = key;
    self.data = data;
    self.row = ParseNode.NEXT_ROW;
    ParseNode.NEXT_ROW += 1;
    self.depth = depth;
    self.children = null;
    self._children = null;
    self.flag = flag;
    
    if (typeof self.data === 'object') {
        if (self.data instanceof Array) {
            self.objType = ParseNode.ARRAY;
            self._children = [];
            for (child = 0; child < self.data.length; child += 1) {
                self._children.push(new ParseNode(child, self.data[child], self.depth + 1));
            }
        } else {
            self.objType = ParseNode.OBJECT;
            self._children = {};
            for (child in self.data) {
                if (self.data.hasOwnProperty(child)) {
                    self._children[child] = new ParseNode(child, self.data[child], self.depth + 1);
                }
            }
        }
    } else {
        self.objType = ParseNode.NATIVE;
    }
}

ParseNode.INIT = function () {
    ParseNode.NATIVE = 0;
    ParseNode.ARRAY = 1;
    ParseNode.OBJECT = 2;
    
    ParseNode.NUM_NODES = 0;
    
    ParseNode.NEXT_ROW = 0;
    
    ParseNode.ROOT = new ParseNode('Data', {
        'Data not linked to any file' : [],
        'Loaded data files' : {}
    }, 0, 'ROOT');
    ParseNode.DOC_ROOT = ParseNode.ROOT._children['Loaded data files'];
    ParseNode.DOC_ROOT.flag = 'DOC_ROOT';
    ParseNode.ORPHANS = ParseNode.ROOT._children['Data not linked to any file'];
    ParseNode.ORPHANS.flag = 'ORPHANS';
    
    ParseNode.ROOT.toggleExpand();
    ParseNode.DOC_ROOT.toggleExpand();
    ParseNode.ORPHANS.toggleExpand();
};
ParseNode.prototype.toggleExpand = function () {
    var self = this,
        temp = self.children;
    self.children = self._children;
    self._children = temp;
};
ParseNode.prototype.setFile = function (name, data) {
    var self = this;
    
    if (self.flag !== 'DOC_ROOT') {
        throw "Can't add a file to anything but ParseNode.DOC_ROOT!";
    }
    
    self.data[name] = data;
    
    if (self.children === null) {
        self._children[name] = new ParseNode(name, data, self.depth + 1, 'FILE');
    } else {
        self.children[name] = new ParseNode(name, data, self.depth + 1, 'FILE');
        self.children[name].toggleExpand();
    }
};
ParseNode.prototype.prepRender = function (useRow) {
    var self = this,
        child,
        nodeList = [];
    
    if (self === ParseNode.ROOT) {
        ParseNode.NEXT_ROW = 0;
    }
    if (useRow) {
        self.row = useRow;
    } else {
        nodeList.push(self);
        self.row = ParseNode.NEXT_ROW;
        ParseNode.NEXT_ROW += 1;
    }
    
    if (self.children === null) {
        // This node is collapsed (or NATIVE); if we have hidden children, make them use our current row
        if (self.objType === ParseNode.ARRAY) {
            for (child = 0; child < self._children.length; child += 1) {
                self._children[child].prepRender(self.row);
            }
        } else if (self.objType === ParseNode.OBJECT) {
            for (child in self._children) {
                if (self._children.hasOwnProperty(child)) {
                    self._children[child].prepRender(self.row);
                }
            }
        }
    } else if (useRow) {
        // Some ancestor is collapsed (we got its row), so pass it along to the children
        if (self.objType === ParseNode.ARRAY) {
            for (child = 0; child < self.children.length; child += 1) {
                self.children[child].prepRender(self.row);
            }
        } else if (self.objType === ParseNode.OBJECT) {
            for (child in self.children) {
                if (self.children.hasOwnProperty(child)) {
                    self.children[child].prepRender(self.row);
                }
            }
        }
    } else {
        // The node and its ancestors aren't collapsed
        if (self.objType === ParseNode.ARRAY) {
            for (child = 0; child < self.children.length; child += 1) {
                nodeList = nodeList.concat(self.children[child].prepRender());
            }
        } else if (self.objType === ParseNode.OBJECT) {
            for (child in self.children) {
                if (self.children.hasOwnProperty(child)) {
                    nodeList = nodeList.concat(self.children[child].prepRender());
                }
            }
        }
    }
    return nodeList;
};
ParseNode.RENDER = function () {
    var container = jQuery('#dataPreviewContainer'),
        svg,
        graphicsList,
        graphicsListWidth = 0,
        mappingView,
        dataList,
        dataListWidth = 0,
        height,
        dataNodes,
        update;
    
    container.html('');
    
    svg = d3.select('#dataPreviewContainer').append('svg');
    graphicsList = svg.append('g');
    dataList = svg.append('g');
    mappingView = svg.append('g');  // Needs to be on top
    
    function renderDataList() {
        dataNodes = ParseNode.ROOT.prepRender();
        
        dataListWidth = BAR_SIZE;
        height = (ParseNode.NEXT_ROW + 1) * BAR_SIZE;
        
        var nodes = dataList.selectAll('.parseNode').data(dataNodes, phrogz('nodeID'));
        
        // Enter
        var nodeEnter = nodes.enter().append('g')
            .attr('class','parseNode');
        nodeEnter.append('text')
            .attr('font-family', '"Consolas", monospace')
            .attr('font-size', FONT_SIZE)
            .attr('dy', 3 * BAR_SIZE / 4)
            .attr('dx', BAR_SIZE / 2);
            
        var controlRadius = BAR_SIZE / 6;
        var bindEnter = nodeEnter.filter(function (d) {
            return d.flag === undefined;
        });
        bindEnter.append('circle')
            .attr('class', 'binding')
            .attr('cx', 0)
            .attr('cy', BAR_SIZE / 2)
            .attr('r', controlRadius);
        var collapseEnter = nodeEnter.filter(function (d) {
            return d.children !== null || d._children !== null;
        }).append('path');
        collapseEnter.attr('class', 'expansion')
                     .attr('d', 'M' + (-controlRadius) + ',' + (-controlRadius) +
                                'L' + controlRadius + ',0' +
                                'L' + (-controlRadius) + ',' + controlRadius + 'Z')
                     .on('click', function (d) {
                        d.toggleExpand();
                        
                        update();
                     });
        
        // Exit
        nodes.exit().remove();
        
        // Update
        nodes.attr('transform',function (d) {
            return 'translate(' + (d.depth*BAR_SIZE) + ',' + d.row*BAR_SIZE + ')';
        });
        nodes.selectAll('.binding')
            .attr('stroke', TEXT_COLOR)
            .attr('fill', TEXT_COLOR)
            .attr('fill-opacity', 0.1);
        nodes.selectAll('.expansion')
            .attr('transform', function (d) {
                if (d.children === null) {
                    return 'matrix(1,0,0,1,0,' + BAR_SIZE + ')'; // just translate, don't rotate
                } else {
                    return 'matrix(0,1,-1,0,0,' + BAR_SIZE + ')'; // rotate, then translate
                }
            })
            .attr('fill', TEXT_COLOR);
        nodes.selectAll('text').text(function (d) {
                var result = d.key;
                if (d.flag !== 'ROOT' && d.flag !== 'ERROR') {
                    result += " : ";
                    if (d.objType === ParseNode.NATIVE) {
                        result += d.data;
                    } else if (d.objType === ParseNode.ARRAY) {
                        result += '[' + d.data.length + ']';
                    } else {
                        result += '{' + Object.keys(d.data).length + '}';
                    }
                }
                // We want to auto-adjust the data group width by the widest, deepest node...
                var nodeWidth = (d.depth + 1) * BAR_SIZE + result.length * CHAR_WIDTH;
                if (dataListWidth < nodeWidth) {
                    dataListWidth = nodeWidth;
                }
                return result;
            }).attr('fill', TEXT_COLOR);
    }
    
    function renderGraphicsList() {
        graphicsListWidth = 0;
        
        if (jQuery('input:radio[name="dataPreviewMode"]').filter(":checked").val() === 'Selection') {
            graphicsList.selectAll('.fullDocItems').remove();
            
            var nodes = graphicsList.selectAll('.selectionItems').data(selectedIDs, function (d) { return d; });
            
            // Enter
            var iconPadding = BAR_SIZE / 8;
            var nodeEnter = nodes.enter().append('g');
            nodeEnter.append('text')
                .attr('font-family', '"Consolas", monospace')
                .attr('font-size', FONT_SIZE)
                .attr('dy', 3 * BAR_SIZE / 4)
                .attr('dx', BAR_SIZE);
            nodeEnter.append('rect')
                .attr('x', iconPadding)
                .attr('y', iconPadding)
                .attr('width', BAR_SIZE - 2*iconPadding)
                .attr('height', BAR_SIZE - 2*iconPadding)
                .attr('fill', '#fff')
                .attr('stroke', '#000');
            nodeEnter.appendClone(function (d) { return d; })
                .setGlobalBBox(iconPadding * 2, iconPadding * 2, BAR_SIZE - 4 * iconPadding, BAR_SIZE - 4 * iconPadding);
            
            // Exit
            nodes.exit().remove();
            
            // Update
            nodes.attr('transform', function (d, i) {
                return 'translate(0,' + (i * BAR_SIZE) + ')';
            });
            nodes.selectAll('text').text(function (d) {
                var nodeWidth = d.length * CHAR_WIDTH + BAR_SIZE * 2;
                if (graphicsListWidth < nodeWidth) {
                    graphicsListWidth = nodeWidth;
                }
                return d;
            }).attr('fill', TEXT_COLOR);
        } else {
            graphicsList.selectAll('.selectionItems').remove();
            
            graphicsList.selectAll('.fullDocItems').data();
        }
        // TODO
        if (height < 100) {
            height = 100;
        }
    }
    
    function renderMappingView() {
        svg.attr('width', graphicsListWidth + LINK_GAP + dataListWidth).attr('height', height);
        mappingView.attr('transform','translate(' + graphicsListWidth + ',0)');
        dataList.attr('transform','translate(' + (graphicsListWidth + LINK_GAP) + ',0)');
        // TODO
    }
    
    update = function () {
        renderDataList();
        renderGraphicsList();
        renderMappingView();
    };
    update();
};
ParseNode.INIT();

function DataFile(name, type, raw) {
    var self = this;
    
    self.name = name;
    self.type = type;
    self.raw = raw;
    self.embed = false;
    self.valid = false;
    self.parsed = null;
    
    self.evaluate();
    
    if (DataFile.LOOKUP.hasOwnProperty(self.name)) {
        DataFile.ALL[DataFile.LOOKUP[self.name]] = self;
    } else {
        DataFile.LOOKUP[self.name] = DataFile.ALL.length;
        DataFile.ALL.push(self);
    }
}
DataFile.ALL = [];
DataFile.LOOKUP = {};

DataFile.SUPPORTED_FORMATS = [
    'text/csv',
    'text/tab-separated-values',
    'text/json',
    'text/js'
];
DataFile.FRIENDLY_FORMAT_NAMES = {
    'text/csv' : 'csv',
    'text/tab-separated-values' : 'tsv',
    'text/json': 'json',
    'text/js' : 'js'
};
DataFile.FORMAT_LOOKUP = {
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
DataFile.CURRENT = 'header';
DataFile.TYPING_TIMER = undefined;

DataFile.EDIT = function () {
    var f = DataFile.GET(DataFile.CURRENT);
    if (f !== null) {
        clearTimeout(DataFile.TYPING_TIMER);
        DataFile.TYPING_TIMER = setTimeout(function () {
            f.raw = jQuery('#dataEditor').val();
            f.evaluate();
            ParseNode.RENDER();
        }, TYPING_INTERVAL);
    }
};
DataFile.GET = function(name) {
    if (name === 'header') {
        return null;
    } else {
        return DataFile.ALL[DataFile.LOOKUP[name]];
    }
};

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
            self.parsed = d3.csv.parse(self.raw);
        } else if (self.type === 'text/tab-separated-values') {
            self.parsed = d3.tsv.parse(self.raw);
        } else {
            throw "Attempted to parse unsupported data type: " + self.type;
        }
        self.valid = true;
    } catch(e) {
        self.parsed = {};
        self.parsed["ERROR: Couldn't parse " + self.name + " as " + self.type] = e.stack.split('\n');
    }
    
    ParseNode.DOC_ROOT.setFile(self.name, self.parsed);
};

DataFile.UPDATE_PANEL = function () {
    var i, f,
        currentDataFile = jQuery('#currentDataFile'),
        editor = jQuery('#dataEditor'),
        embedBox = jQuery('#embedFileCheckBox'),
        dataTypeSelect = jQuery('#dataTypeSelect'),
        optionText = "";
    
    jQuery('#dataFileInput').remove();
    jQuery('#dataPanel span').append('<input id="dataFileInput" type="file" onchange="DataFile.LOAD_FILES();" multiple style="visibility:hidden"/>');
    currentDataFile.find('option').remove();
    
    if (DataFile.ALL.length === 0 || DataFile.CURRENT === 'header') {
        currentDataFile.append('<option value="header" selected>(no data files loaded)</option>');
        editor.prop('disabled', true);
        editor.val('');
        embedBox.prop('checked', false);
        embedBox.prop('disabled', true);
        dataTypeSelect.prop('disabled', true);
    } else {
        for (i = 0; i < DataFile.ALL.length; i += 1) {
            f = DataFile.ALL[i];
            optionText = '<option value="' + f.name + '"';
            
            if (DataFile.CURRENT === f.name) {
                optionText += ' selected';
                editor.prop('disabled', false);
                editor.val(f.raw);
                embedBox.prop('disabled', false);
                embedBox.prop('checked', f.embed);
                dataTypeSelect.prop('disabled', false);
                dataTypeSelect.val(f.type);
            }
            optionText += '>' + f.name + '</option>';
            currentDataFile.append(optionText);
        }
    }
    currentDataFile.append('<option value="loadNewFile">Load...</option>');
    
    ParseNode.RENDER();
};

DataFile.SWITCH_FILE = function () {
    var lastFile = DataFile.CURRENT;
    DataFile.CURRENT = jQuery('#currentDataFile').val();
    
    if (DataFile.CURRENT === 'loadNewFile') {
        // It will take a while for the user to pick some files, so for now,
        // revert back to the previous file in case they don't pick anything
        // that we can load (the loading and panel updating will be fired by dataFileInput's onchange):
        jQuery('#currentDataFile').val(lastFile);
        DataFile.CURRENT = lastFile;
        
        jQuery('#dataFileInput').click();
    } else {
        DataFile.UPDATE_PANEL();
    }
};
DataFile.EMBED = function () {
    var current = DataFile.GET(DataFile.CURRENT);
    if (current !== null) {
        current.embed = jQuery('#embedFileCheckBox').prop('checked');
    }
    DataFile.UPDATE_PANEL();
};
DataFile.CHANGE_TYPE = function () {
    var current = DataFile.GET(DataFile.CURRENT),
        newType = jQuery('#dataTypeSelect').val();
    if (current !== null && newType !== current.type) {
        current.type = newType;
        current.evaluate();
    }
    DataFile.UPDATE_PANEL();
};
DataFile.LOAD_SAMPLE = function (url) {
    jQuery.get(url, function (dataString) {
        var parts = url.split('/'),
            name = parts[parts.length - 1],
            extension = name.split('.');
        
        extension = extension[extension.length - 1];
        extension = DataFile.FORMAT_LOOKUP[extension.toLowerCase()];
        
        new DataFile(name, extension, dataString);
        
        DataFile.CURRENT = name;
        DataFile.UPDATE_PANEL();
    });
};
DataFile.LOAD_FILE = function (f) {
    var fileReader = new FileReader();
    fileReader.onload = function (e) {
        new DataFile(f.name, DataFile.FORMAT_LOOKUP[f.type], e.target.result);
    };
    fileReader.readAsText(f);
};
DataFile.LOAD_FILES = function () {
    var newFiles = jQuery('#dataFileInput')[0].files,
        i,
        j,
        warningText,
        warnedAboutFiles = false,
        unloadedFiles = [],
        lastFile = DataFile.CURRENT;
    
    for (i = 0; i < newFiles.length; i += 1) {
        if (DataFile.FORMAT_LOOKUP.hasOwnProperty(newFiles[i].type) === false) {
            if (warnedAboutFiles === false) {
                warningText = "Sorry, iD3 does not support " + newFiles[i].type + ". It only supports ";
                for (j = 0; j < DataFile.SUPPORTED_FORMATS.length; j += 1) {
                    if (j !== 0) {
                        warningText += ', ';
                    }
                    if (j === DataFile.SUPPORTED_FORMATS.length-1) {
                        warningText += 'and ';
                    }
                    warningText += DataFile.FRIENDLY_FORMAT_NAMES[DataFile.SUPPORTED_FORMATS[j]];
                }
                warningText += " data files.";
                alert(warningText);
                warnedAboutFiles = true;
            }
        } else {
            unloadedFiles.push(newFiles[i].name);
            DataFile.LOAD_FILE(newFiles[i]);
            if (DataFile.CURRENT === lastFile) {
                // Set the current file to the first one that loads
                DataFile.CURRENT = newFiles[i].name;
            }
        }
    }
    // Update the panel when all the files have finished loading
    function updateWhenLoaded() {
        var f;
        for (f = 0; f < DataFile.ALL.length; f += 1) {
            if (unloadedFiles.indexOf(DataFile.ALL[f].name) !== -1) {
                unloadedFiles.splice(unloadedFiles.indexOf(DataFile.ALL[f].name),1);
            }
        }
        // TODO: add a spinner?
        if (unloadedFiles.length > 0) {
            window.setTimeout(updateWhenLoaded, 200);
        } else {
            DataFile.UPDATE_PANEL();
        }
    }
    updateWhenLoaded();
};

function getData(filename) {
    return DataFile.GET(filename).parsed;
}