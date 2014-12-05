/*jslint evil:true*/
function Datum (parent, key, name, data, bindable) {
    var self = this;
    
    self.parent = parent;
    
    /*
     * The key is kind of magical; if we eval() it, it gives us the actual data item - this way
     * we don't actually store direct references to the object. The key also happens to be a
     * unique identifier (useful for hashing), pointing to the first time we encounter it. Because
     * data can contain multiple references to the same item, we need to also store all the non-nested
     * ways to get to the data item (aliases)
     */
    self.key = key;
    self.aliases = [];
    
    self.visibleRow = null; // Where I can be found in the preview, or null if I'm hidden
    
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
    
    // Populate the queue with files
    for (childName in DATA.allFiles) {
        if (DATA.allFiles.hasOwnProperty(childName)) {
            
            DATA.allFiles[childName].evaluate();
            childKey = 'DATA.allFiles["' + childName + '"].parsed';
            
            Datum.ALL[childKey] = new Datum(root,
                                            childKey,
                                            childName,
                                            DATA.allFiles[childName].parsed,
                                            false);
            Datum.ALL[childKey].isError = !DATA.allFiles[childName].valid;
            
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
        datum = Datum.ALL[data.hanpuku_key];
        
        if (datum.objType === Datum.ARRAY) {
            for (childName = 0; childName < data.length; childName += 1) {
                childKey = datum.key + '[' + childName + ']';
                
                if (data.hasOwnProperty('hanpuku_key')) {
                    childDatum = Datum.ALL[childKey];
                } else {
                    childDatum = new Datum(datum,
                                           childKey,
                                           childName,
                                           data[childName]);
                    Datum.ALL[childKey] = childDatum;
                    datum.children[childName] = childDatum;
                    queue.push(data[childName]);
                }
                
                Datum.BFS.push(childKey);
            }
        } else if (datum.objType === Datum.OBJECT) {
            for (childName in data) {
                    if (data.hasOwnProperty(childName)) {
                        childKey = datum.key + '["' + childName + '"]';
                    
                    if (data.hasOwnProperty('hanpuku_key')) {
                        childDatum = Datum.ALL[childKey];
                    } else {
                        childDatum = new Datum(datum,
                                               childKey,
                                               childName,
                                               data[childName]);
                        Datum.ALL[childKey] = childDatum;
                        datum.children[childName] = childDatum;
                        queue.push(data[childName]);
                    }
                    
                    Datum.BFS.push(childKey);
                }
            }
        }
    }
    
    // Finally, we need to go back and throw away all the temporary hanpuku_key tags we added to data items
    Datum.PURGE_TEMPORARY_KEYS(DATA.allFiles);
};
Datum.PURGE_TEMPORARY_KEYS = function (data) {
    var i;
    
    if (typeof data === 'object') {
        delete data.hanpuku_key;
        
        if (data instanceof Array) {
            for (i = 0; i < data.length; i += 1) {
                datum.PURGE_TEMPORARY_KEYS(data[i]);
            }
        } else {
            for (i in data) {
                if (data.hasOwnProperty(i)) {
                    datum.PURGE_TEMPORARY_KEYS(data[i]);
                }
            }
        }
    }
};
Datum.prototype.getValue = function () {
    var self = this;
    return eval(self.key);
};







function DataRow (parent, datum, rowNumber, depth, isClone) {
    var self = this,
        alias;
    
    self.datum = datum;
    self.rowNumber = rowNumber;
    self.depth = depth;
    self.expanded = false;
    
    if (isClone !== true) {
        // Try to preserve expanded / collapsed status
        if (DataRow.LAST_EXPANSIONS.hasOwnProperty(datum.key)) {
            // I was (probably) in the old dataset; match the old
            // status if I can still even be expanded
            if (datum.children !== null) {
                self.expanded = DataRow.LAST_EXPANSIONS[datum.key];
            }
        }
        
        // Point the datum key and all its aliases to this row (this
        // is the highest version of it that is visible)
        datum.visibleRow = rowNumber;
        DataRow.KEY_TO_ROW[datum.key] = rowNumber;
        for (alias = 0; alias < datum.aliases.length; alias += 1) {
            DataRow.KEY_TO_ROW[datum.aliases[alias]] = rowNumber;
        }
    }
}
DataRow.ALL = [];
DataRow.KEY_TO_ROW = {};
DataRow.LAST_EXPANSIONS = {
    'DATA.allFiles' : true
};

DataRow.INIT = function () {
    var queue,
        row,
        key,
        datum,
        childIndex,
        childRow,
        alias;
    
    // Store which keys were expanded before
    DataRow.LAST_EXPANSIONS = {};
    for (i = 0; i < DataRow.ALL.length; i += 1) {
        DataRow.LAST_EXPANSIONS[DataRow.ALL[i].key] = true;
    }
    
    // Reset our other lookups
    DataRow.KEY_TO_ROW = {};
    DataRow.KEY_TO_ROW[self.key] = 0;
    
    DataRow.ALL = [new DataRow(Datum.ALL[0], 0, 0)];
    
    // Create all the expanded nodes breadth-first
    queue = [DataRow.ALL[0]];
    while (queue.length > 0) {
        row = queue.splice(0,1)[0];
        
        if (row.expanded === true) {
            if (row.datum.objType === Datum.ARRAY) {
                for (childIndex = 0; childIndex < row.datum.children.length; childIndex += 1) {
                    if (DataRow.KEY_TO_ROW.hasOwnProperty(row.datum.key)) {
                        // This is a clone of another row we can already see...
                        childRow = new DataRow(row.datum.children[childIndex], DataRow.ALL.length, row.depth + 1, true);
                    } else {
                        childRow = new DataRow(row.datum.children[childIndex], DataRow.ALL.length, row.depth + 1);
                        queue.push(childRow);
                    }
                    DataRow.ALL.push(childRow);
                }
            } else if (row.datum.objType === Datum.OBJECT) {
                for (childIndex in row.datum.children) {
                    if (row.datum.children.hasOwnProperty(childIndex)) {
                        if (DataRow.KEY_TO_ROW.hasOwnProperty(row.datum.key)) {
                            // This is a clone of another row we can already see...
                            childRow = new DataRow(row.datum.children[childIndex], DataRow.ALL.length, row.depth + 1, true);
                        } else {
                            childRow = new DataRow(row.datum.children[childIndex], DataRow.ALL.length, row.depth + 1);
                            queue.push(childRow);
                        }
                        DataRow.ALL.push(childRow);
                    }
                }
            }
        }
    }
    
    /*
     * Now that the expanded nodes have been taken care of, we need to
     * do a little clean up; some objects may not be visible at all,
     * but we still want to point their key and aliases to their closest
     * ancestor.
     */
    for (key in Datum.ALL) {
        if (Datum.ALL.hasOwnProperty(key) &&
                DataRow.KEY_TO_ROW.hasOwnProperty(key) === false) {
            
            datum = Datum.ALL[key];
            // First of all, we're not visible...
            datum.visibleRow = null;
            
            // Find the closest ancestor that is
            ancestor = datum.parent;
            while (DataRow.KEY_TO_ROW.hasOwnProperty(ancestor.key) === false) {
                ancestor = ancestor.parent;
            }
            
            // Point my key and all my aliases to the ancestor row
            DataRow.KEY_TO_ROW[key] = ancestor.visibleRow;
            for (alias = 0; alias < datum.aliases.length; alias += 1) {
                DataRow.KEY_TO_ROW[datum.aliases[alias]] = ancestor.visibleRow;
            }
        }
    }
};

function MappingManager () {
    var self = this;
    
    self.showSelection = false;
}
MappingManager.BAR_SIZE = 20;
MappingManager.X_WIDTH = 0.55; // the max aspect ratio for common monospace fonts
MappingManager.LINK_GAP = 100;
MappingManager.ERROR_COLOR = '#f00';

MappingManager.prototype.init = function () {
    //self.onRefresh();
};
MappingManager.prototype.disableUI = function () {
    
};
MappingManager.prototype.onNewData = function () {
    var self = this;
    console.log('a');
    Datum.INIT();
    console.log('b');
    self.onRefresh();
    console.log('c');
};
MappingManager.prototype.toggleCollapse = function (row) {
    var self = this;
    row.expanded = !row.expanded;
    self.onRefresh();
};
MappingManager.prototype.onRefresh = function () {
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
        
        /*nodes = graphicsList.selectAll('.selectionItems').data(ILLUSTRATOR.selectedIDs, function (d) { return d; });
        
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
        
        width = left + DataManager.LINK_GAP;*/
    }
    
    // Draw the data
    dataList.attr('transform', 'translate(' + width + ',0)');
    nodes = dataList.selectAll('.dataNode').data(DataRow.ALL, function (row) { return row.datum.key; });
    
    // Enter
    nodesEnter = nodes.enter().append('g')
        .attr('class','dataNode');
    nodesEnter.append('text')
        .attr('font-family', '"Consolas", monospace')
        .attr('font-size', EXTENSION.fontSize)
        .attr('dy', 3 * MappingManager.BAR_SIZE / 4)
        .attr('dx', MappingManager.BAR_SIZE / 2);
        
    var controlRadius = MappingManager.BAR_SIZE / 6;
    var bindEnter = nodesEnter.filter(function (row) {
        return row.datum.bindable === true;
    });
    bindEnter.append('circle')
        .attr('class', 'binding')
        .attr('cx', 0)
        .attr('cy', MappingManager.BAR_SIZE / 2)
        .attr('r', controlRadius);
    var collapseEnter = nodesEnter.filter(function (row) {
        return row.datum.children !== null;
    }).append('path');
    collapseEnter.attr('class', 'expansion')
                 .append('rect')
                 .attr('x', -controlRadius)
                 .attr('y', -controlRadius)
                 .attr('width', controlRadius*2)
                 .attr('height', controlRadius*2)
                 .style('fill', 'rgba(0,0,0,0.001)')
                 .style('stroke', EXTENSION.textColor)
                 .style('stroke-width', '2px')
                 .on('click', function (row) { self.toggleCollapse(row); });
    collapseEnter.append('path')
                 .style('fill', 'none')
                 .style('stroke', EXTENSION.textColor)
                 .style('stroke-width', '2px');
    
    // Exit
    nodes.exit().remove();
    
    // Update
    nodes.attr('transform',function (i, j) {
        var d = PreviewDatum.GET_BY_INDEX(i);
        return 'translate(' + (d.depth * MappingManager.BAR_SIZE) + ',' + j * MappingManager.BAR_SIZE + ')';
    });
    nodes.selectAll('.binding')
        .style('stroke', EXTENSION.textColor)
        .style('fill', EXTENSION.textColor)
        .style('fill-opacity', 0.5);
    nodes.selectAll('.expansion').selectAll('path')
        .attr('d', 'M' + (-controlRadius) + ',' + (-controlRadius) +
                            'L' + controlRadius + ',0' +
                            'L' + (-controlRadius) + ',' + controlRadius + 'Z')
        .attr('d', function (row) {
            var d = 'M' + (-controlRadius) + ',0H' + controlRadius;
            if (row.expanded === false) {
                d += 'M0,' + (-controlRadius) + 'V' + controlRadius;
            }
            return d;
        });
    nodes.selectAll('text').text(function (row) {
        var result = row.datum.name,
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
                    (d.depth + 1) * MappingManager.BAR_SIZE +
                    (result.length+1) * MappingManager.X_WIDTH * MappingManager.fontSize;
        if (width < nodeWidth) {
            width = nodeWidth;
        }
        return result;
    }).style('fill', function (row) {
        if (row.datum.isError === false) {
            return EXTENSION.textColor;
        } else {
            return MappingManager.ERROR_COLOR;
        }
    });
    
    svg.attr('width', width)
       .attr('height', height);
};