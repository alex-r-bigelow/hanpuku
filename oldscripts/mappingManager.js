/*jslint evil:true*/
function Datum (parent, key, name, data, bindable) {
    var self = this;
    
    self.parent = parent;
    
    /*
     * The key is kind of magical; if we eval() it, it gives us the actual data item - this way
     * we don't actually store direct references to the object. The key also happens to be a
     * unique identifier (useful for hashing), pointing to the first time we encounter it. Because
     * data can contain multiple references to the same item (d3 frequently relies on circular
     * data structures), we need to also store all the non-nested ways to get to the data item (aliases)
     */
    self.key = key;
    self.aliases = [];
    
    self.visibleRow = null; // Where I can be found in the preview (DataRow object), or null if I'm hidden
    
    self.name = name;   // User-readable label; this was the index that people used to get here, and the tail end of the key
    
    self.bindable = bindable === undefined ? true : bindable;
    self.isError = false;
    
    if (typeof data === 'object') {
        if (data instanceof Array) {
            self.objType = Datum.ARRAY;
            self.children = [];
        } else {
            self.objType = Datum.OBJECT;
            self.children = {};
        }
        
        // For non-primitive values, we patch a little tag onto data items temporarily for cycle checking;
        // these are discarded at the end of INIT
        if (data.hasOwnProperty('hankpuku_key')) {
            throw "Encountered an unexpected hanpuku_key property; can't resolve cyclical reference.";
        }
        data.hanpuku_key = self.key;
    } else {
        self.objType = Datum.PRIMITIVE;
        self.children = null;
    }
}
Datum.ALL = {};
Datum.BFS = [];

Datum.ARRAY = 0;
Datum.OBJECT = 1;
Datum.PRIMITIVE = 2;

Datum.INIT = function () {
    var root = new Datum(null, 'DATA.allFiles', 'Loaded Files', DATA.allFiles, false),
        queue = [],
        data,
        datum,
        childName,
        childKey,
        childDatum;
    
    Datum.ALL['DATA.allFiles'] = root;
    Datum.BFS = ['DATA.allFiles'];
    
    // Populate the queue with files
    for (childName in DATA.allFiles) {
        if (DATA.allFiles.hasOwnProperty(childName) && childName !== 'hanpuku_key') {
            DATA.allFiles[childName].evaluate();
            childKey = 'DATA.allFiles["' + childName + '"].parsed';
            
            Datum.ALL[childKey] = new Datum(root,
                                            childKey,
                                            DATA.allFiles[childName].name,
                                            DATA.allFiles[childName].parsed,
                                            false);
            Datum.ALL[childKey].isError = !DATA.allFiles[childName].valid;
            root.children.push(Datum.ALL[childKey]);
            Datum.BFS.push(childKey);
            queue.push(DATA.allFiles[childName].parsed);
        }
    }
    
    /*
     * Create Datum objects in BREADTH-FIRST order! This ensures
     * that an object that has multiple references is stored and
     * displayed at its highest position in the pseudo-tree
     */
    while (queue.length > 0) {
        data = queue.splice(0,1)[0];
        
        if (data.hasOwnProperty('hanpuku_key')) {
            datum = Datum.ALL[data.hanpuku_key];
            
            // Recurse if relevant
            if (datum.objType === Datum.ARRAY) {
                for (childName = 0; childName < data.length; childName += 1) {
                    childKey = datum.key + '[' + childName + ']';
                    
                    if (data[childName].hasOwnProperty('hanpuku_key')) {
                        childDatum = Datum.ALL[data[childName].hanpuku_key];
                        childDatum.aliases.push(childKey);
                    } else {
                        childDatum = new Datum(datum,
                                               childKey,
                                               childName,
                                               data[childName]);
                        queue.push(data[childName]);
                    }
                    
                    datum.children[childName] = childDatum;
                    Datum.ALL[childKey] = childDatum;
                    Datum.BFS.push(childKey);
                }
            } else if (datum.objType === Datum.OBJECT) {
                for (childName in data) {
                    if (data.hasOwnProperty(childName) && childName !== 'hanpuku_key') {
                        childKey = datum.key + '["' + childName + '"]';
                        
                        if (data[childName].hasOwnProperty('hanpuku_key')) {
                            childDatum = Datum.ALL[data[childName].hanpuku_key];
                            childDatum.aliases.push(childKey);
                        } else {
                            childDatum = new Datum(datum,
                                                   childKey,
                                                   childName,
                                                   data[childName]);
                            queue.push(data[childName]);
                        }
                        
                        datum.children[childName] = childDatum;
                        Datum.ALL[childKey] = childDatum;
                        Datum.BFS.push(childKey);
                    }
                }
            }
        }
    }
    
    // Finally, we need to go back and throw away all the temporary hanpuku_key tags we added to data items
    for (key in Datum.ALL) {
        if (Datum.ALL.hasOwnProperty(key)) {
            data = Datum.ALL[key].getValue();
            delete data.hanpuku_key;
        }
    }
};
Datum.prototype.getValue = function () {
    var self = this;
    return eval(self.key);
};







function DataRow (parent, datum) {
    var self = this;
    
    self.parent = parent;
    self.datum = datum;
    self.rowNumber = null;
    self.depth = null;
    
    self.childRows = []; // We need a separate link to child DataRows to figure out row positions depth-first
    
    if (datum.visibleRow === null) {
        // Because we were constructed BFS, we know that we're
        // the highest visible version of datum in the tree
        self.isClone = false;
        
        // Point the datum to this row (this
        // is the highest version of it that is visible)
        datum.visibleRow = self;
        
        // Try to preserve expanded / collapsed status
        self.expanded = DataRow.LAST_EXPANSIONS.hasOwnProperty(datum.key) && datum.children !== null;
    } else {
        // datum is already visible elsewhere; our key has
        // already been pointed at that row. Don't allow expansion.
        self.isClone = true;
        self.expanded = false;
    }
}
DataRow.ALL = [];
DataRow.LAST_EXPANSIONS = null;
DataRow.KEY_TO_ROW = {};
/*
 * The KEY_TO_ROW lookup points every key in the dataset to a DataRow object;
 * if a data item occurs more than once (cyclic datasets), a main
 * DataRow object created at the highest visible location of that data item;
 * any other visible instances of that item will have isClone set to true.
 * Datum objects' visibleRow variable will point to the main DataRow if it
 * exists. If all instances of a data item are hidden, the Datum object's
 * visibleRow will be null, and KEY_TO_ROW will point to the nearest visible
 * ancestor of that data item.
 */

DataRow.INIT = function () {
    var root,
        queue,
        row,
        key,
        datum,
        childIndex,
        childRow,
        alias;
    
    // Store which keys were expanded before
    if (DataRow.LAST_EXPANSIONS === null) {
        // Start out with files visible
        DataRow.LAST_EXPANSIONS = {
            'DATA.allFiles' : true
        };
    } else {
        DataRow.LAST_EXPANSIONS = {};
    }
    for (i = 0; i < DataRow.ALL.length; i += 1) {
        DataRow.ALL[i].datum.visibleRow = null;   // While we're at it, clear which row Datum objects point to
        if (DataRow.ALL[i].expanded === true) {
            DataRow.LAST_EXPANSIONS[DataRow.ALL[i].datum.key] = true;
        }
    }
    
    root = new DataRow(null, Datum.ALL['DATA.allFiles']);
    root.datum.visibleRow = root;
    
    // Create all the expanded nodes breadth-first
    queue = [root];
    while (queue.length > 0) {
        row = queue.splice(0,1)[0];
        if (row.expanded === true) {
            if (row.datum.objType === Datum.ARRAY) {
                for (childIndex = 0; childIndex < row.datum.children.length; childIndex += 1) {
                    childRow = new DataRow(row, row.datum.children[childIndex]);
                    row.childRows.push(childRow);
                    if (!childRow.isClone) {
                        queue.push(childRow);
                    }
                }
            } else if (row.datum.objType === Datum.OBJECT) {
                for (childIndex in row.datum.children) {
                    if (row.datum.children.hasOwnProperty(childIndex)) {
                        childRow = new DataRow(row, row.datum.children[childIndex]);
                        row.childRows.push(childRow);
                        if (!childRow.isClone) {
                            queue.push(childRow);
                        }
                    }
                }
            }
        }
    }
    
    // Finally, we need to figure out which nodes go where, and create our lookups
    // for Datum keys and all aliases
    DataRow.KEY_TO_ROW = {};    
    DataRow.ALL = [];
    
    root.initPosition(0);
    
    // Finally, some cleanup: point all keys and aliases
    // to the nearest visible ancestor's preferred row
    for (childIndex = 0; childIndex < Datum.BFS.length; childIndex += 1) {
        key = Datum.BFS[childIndex];
        datum = Datum.ALL[key];
        
        // Find the closest visible ancestor (could be this)
        ancestor = datum;
        while (ancestor.visibleRow === null) {
            ancestor = ancestor.parent;
        }
        
        // Point my key and all my aliases to the ancestor row
        DataRow.KEY_TO_ROW[key] = ancestor.visibleRow;
        for (alias = 0; alias < datum.aliases.length; alias += 1) {
            DataRow.KEY_TO_ROW[datum.aliases[alias]] = ancestor.visibleRow;
        }
    }
};
DataRow.prototype.initPosition = function (depth) {
    var self = this,
        childIndex;
    
    self.depth = depth;
    self.rowNumber = DataRow.ALL.length;
    
    DataRow.ALL.push(self);
    
    if (self.expanded === true) {
        for (childIndex = 0; childIndex < self.childRows.length; childIndex += 1) {
            self.childRows[childIndex].initPosition(depth + 1);
        }
    }
};

DataRow.prototype.isExpandable = function () {
    var self = this;
    if (self.isClone === true) {
        return false;
    }
    if (self.datum.objType === Datum.PRIMITIVE) {
        return false;
    } else if (self.datum.objType === Datum.ARRAY) {
        return self.datum.children.length > 0;
    } else {
        for (var childName in self.datum.children) {
            if (self.datum.children.hasOwnProperty(childName)) {
                return true;
            }
        }
        return false;
    }
};

function MappingManager () {
    var self = this;
    
    self.staleDatum = true;
    self.showSelection = false;
}
MappingManager.BAR_SIZE = 20;
MappingManager.X_WIDTH = 0.6; // the max aspect ratio for common monospace fonts
MappingManager.LINK_GAP = 100;
MappingManager.ERROR_COLOR = '#f00';

MappingManager.prototype.init = function () {
    //self.onRefresh();
};
MappingManager.prototype.disableUI = function () {
    var self = this;
    // show the data even if there isn't a file open
    self.onRefresh();
};
MappingManager.prototype.onNewData = function () {
    var self = this;
    
    self.staleDatum = true;
    self.onRefresh();
};
MappingManager.prototype.toggleCollapse = function (row) {
    var self = this;
    row.expanded = !row.expanded;
    self.onRefresh();
};
MappingManager.prototype.onRefresh = function () {
    MappingManager.BAR_SIZE = EXTENSION.largeFontSize + 6;
    
    var self = this,
        svg,
        svgEnter,
        graphicsList,
        mappingOverlay,
        dataList,
        left = 0,
        width = MappingManager.BAR_SIZE,
        height = 0,
        nodes,
        nodesEnter;
    
    if (self.staleDatum === true) {
        Datum.INIT();
    }
    
    // Update the rows
    DataRow.INIT();
    height = DataRow.ALL.length * MappingManager.BAR_SIZE;
    
    // Set up our svg and its groups on the first pass
    svg = ed3.select('#dataPreview').selectAll('svg');
    svgEnter = svg.data([0]).enter().append('svg');
    svgEnter.append('g').attr('class','graphicsList');
    svgEnter.append('g').attr('class','dataList');
    svgEnter.append('g').attr('class','mappingOverlay');
    
    graphicsList = svg.select('.graphicsList');
    dataList = svg.select('.dataList');
    mappingOverlay = svg.select('.mappingOverlay');  // Needs to be on top
    
    // Draw the selection list
    if (self.showSelection === true) {
        // TODO
    }
    
    // Draw the data
    dataList.attr('transform', 'translate(' + width + ',0)');
    
    nodes = dataList.selectAll('.dataNode')
        .data(DataRow.ALL, function (row) { return row.datum.key; });
    
    // Enter
    nodesEnter = nodes.enter().append('g')
        .attr('class','dataNode');
    nodesEnter.append('text')
        .attr('font-family', '"Consolas", monospace')
        .attr('font-size', EXTENSION.largeFontSize)
        .attr('dy', 3 * MappingManager.BAR_SIZE / 4)
        .attr('dx', MappingManager.BAR_SIZE / 2);
        
    var controlRadius = MappingManager.BAR_SIZE / 6;
    var bindEnter = nodesEnter.filter(function (row) {
        return row.datum.bindable === true;
    });
    bindEnter.append('circle')
        .attr('class', 'binding')
        .attr('cx', controlRadius)
        .attr('cy', 1.5*controlRadius)
        .attr('r', controlRadius);
    var collapseEnter = nodesEnter.filter(function (row) {
        return row.isExpandable();
    }).append('g');
    collapseEnter.attr('class', 'expansion')
                 .attr('transform', 'translate(0,' + (MappingManager.BAR_SIZE - controlRadius*3) + ')');
    collapseEnter.append('rect')
                 .attr('x', 0)
                 .attr('y', 0)
                 .attr('width', controlRadius*2)
                 .attr('height', controlRadius*2)
                 .style('fill', 'rgba(0,0,0,0.001)')
                 .style('stroke', EXTENSION.textColor)
                 .style('stroke-width', '0.5px');
    collapseEnter.append('path')
                 .style('fill', 'none')
                 .style('stroke', EXTENSION.textColor)
                 .style('stroke-width', '1.5px');
    
    // Exit
    nodes.exit().remove();
    
    // Update
    nodes.attr('transform',function (row) {
        return 'translate(' + (row.depth * MappingManager.BAR_SIZE) + ',' + row.rowNumber * MappingManager.BAR_SIZE + ')';
    });
    nodes.selectAll('.binding')
        .style('stroke', EXTENSION.textColor)
        .style('fill', EXTENSION.textColor)
        .style('fill-opacity', 0.5);
    nodes.selectAll('.expansion')
        .on('click', function () {
            // d3 doesn't propagate new data to descendants with selectAll;
            // we need to point to the parent data item!
            // See this thread: https://github.com/mbostock/d3/issues/1319
            var row = this.parentNode.__data__;
            self.toggleCollapse(row);
        });
    nodes.selectAll('.expansion').selectAll('path')
        .attr('d', function () {
            // d3 doesn't propagate new data to descendants with selectAll;
            // we need to point to the grandparent data item!
            // See this thread: https://github.com/mbostock/d3/issues/1319
            var row = this.parentNode.parentNode.__data__,
                d = 'M0,' + controlRadius + 'H' + (controlRadius*2);
            if (row.expanded === false) {
                d += 'M' + controlRadius + ',0V' + (controlRadius*2);
            }
            return d;
        });
    nodes.selectAll('text').text(function () {
        var row = this.parentNode.__data__,
            result = String(row.datum.name),
            nodeWidth;
        
        if (row.datum.isError === true) {
            result += " : PARSING ERROR!";
        } else if (row.depth !== 0) {
            result += " : ";
            if (row.datum.objType === Datum.PRIMITIVE) {
                result += row.datum.getValue();
            } else if (row.datum.objType === Datum.ARRAY) {
                result += '[' + row.datum.children.length + ']';
            } else {
                result += '{' + Object.keys(row.datum.children).length + '}';
            }
        }
        
        // We want to auto-adjust the data group width by the widest, deepest node...
        nodeWidth = left +
                    (row.depth + 2) * MappingManager.BAR_SIZE +
                    (result.length + 1) * MappingManager.X_WIDTH * EXTENSION.largeFontSize;
        if (width < nodeWidth) {
            width = nodeWidth;
        }
        return result;
    }).style('fill', function () {
        var row = this.parentNode.__data__;
        if (row.datum.isError === false) {
            return EXTENSION.textColor;
        } else {
            return MappingManager.ERROR_COLOR;
        }
    });
    
    svg.attr('width', width)
       .attr('height', height);
};