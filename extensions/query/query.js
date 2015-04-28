/*globals window, console, document, jQuery, d3*/
var queries = [{
        append : true,
        attribute : 'CSS class name',
        queryType : 'Is',
        queryValue : 'lotrCharacterNames'
    }],
    attributes = {
        Data : {
            'Name' : 'Categorical',
            'Race' : 'Categorical',
            'Role' : 'Categorical',
            'Age' : 'Both'
        },
        Visual : {
            'X' : 'Quantitative',
            'Y' : 'Quantitative',
            'Width' : 'Quantitative',
            'Height' : 'Quantitative',
            'Opacity' : 'Quantitative',
            'Text Contents' : 'Categorical',
            'Illustrator ID' : 'Categorical',
            'Fill ->;' : 'Quantitative',
            'Stroke ->;' : 'Quantitative'
        },
        Other : {
            'CSS class name' : 'Categorical',
            'Function ' : 'Function'
        }
    },
    queryTypes = {
        Categorical : [
            'Matches',
            'Contains',
            'Begins with',
            'Ends with',
            'Is',
            'Is not'
        ],
        Quantitative : [
            '=',
            '<',
            '>',
            '\u2264',
            '\u2265',
            '\u2260'
        ]
    };

function lookupAttrType(attrName) {
    "use strict";
    var c,
        a,
        t = null;
    for (c in attributes) {
        if (attributes.hasOwnProperty(c)) {
            for (a in attributes[c]) {
                if (attributes[c].hasOwnProperty(a) &&
                        a === attrName) {
                    t = attributes[c][a];
                    break;
                }
            }
            if (t !== null) {
                break;
            }
        }
    }
    
    return t;
}

function update() {
    "use strict";
    var q = d3.select('#queryList').selectAll('.query').data(queries, function (d, i) {
            return i;
        }),
        e = q.enter().append('div')
            .attr('class', 'query'),
        appendFilter = e.append('span')
            .attr('class', 'appendFilterRadios'),
        attribute = e.append('select')
            .attr('class', 'attribute'),
        queryType = e.append('select')
            .attr('class', 'queryType'),
        buttons;
    
    q.exit().remove();
    
    e.append('input')
        .attr('class', 'queryValueInput')
        .on('keyup', function (d, i) {
            d.queryValue = this.value;
        });
    q.selectAll('.queryValueInput')
        .attr('value', function (d, i) {
            return d.queryValue;
        });
    
    appendFilter.append('input')
        .attr('type', 'radio')
        .attr('class', 'appendRadio')
        .attr('id', function (d, i) {
            return 'appendFilterAdd' + i;
        })
        .attr('name', function (d, i) {
            return 'appendFilter' + i;
        });
    d3.selectAll('.appendRadio')
        .each(function (d) {
            if (d.append === true) {
                this.setAttribute('checked', '');
            } else {
                this.removeAttribute('checked');
            }
        });
    appendFilter.append('label')
        .text('Add')
        .attr('for', function (d, i) {
            return 'appendFilterAdd' + i;
        });
    
    appendFilter.append('input')
        .attr('type', 'radio')
        .attr('class', 'filterRadio')
        .attr('id', function (d, i) {
            return 'appendFilterRemove' + i;
        })
        .attr('name', function (d, i) {
            return 'appendFilter' + i;
        });
    appendFilter.append('label')
        .text('Remove if')
        .attr('for', function (d, i) {
            return 'appendFilterRemove' + i;
        });
    
    d3.selectAll('.filterRadio')
        .each(function (d) {
            if (d.append === false) {
                this.setAttribute('checked', '');
            } else {
                this.removeAttribute('checked');
            }
        });
    
    
    attribute.on('change', function (d, i) {
        var attrType = lookupAttrType(this.value);
        queries[i].attribute = this.value;
        if (attrType !== 'Both' && attrType !== queries[i].queryType) {
            if (queryTypes.hasOwnProperty(attrType)) {
                queries[i].queryType = queryTypes[attrType][0];
            }
        }
        update();
    });
    attribute.selectAll('optgroup').data(d3.entries(attributes))
        .enter().append('optgroup')
        .attr('label', function (d) { return d.key; })
        .selectAll('option').data(function (d) { return d3.entries(d.value); })
        .enter().append('option')
        .text(function (d) { return d.key; })
        .attr('class', function (d) { return d.value; });
    
    d3.selectAll('.attribute').selectAll('option')
        .each(function (d) {
            if (d.key === d3.select(this.parentNode.parentNode.parentNode).datum().attribute) {
                this.setAttribute('selected', '');
            } else {
                this.removeAttribute('selected');
            }
        });
    
    queryType.on('change', function (d, i) {
        queries[i].queryType = this.value;
        update();
    });
    queryType.selectAll('optgroup').data(d3.entries(queryTypes))
        .enter().append('optgroup')
        .attr('label', function (d) { return d.key; })
        .selectAll('option').data(function (d) { return d.value; })
        .enter().append('option')
        .text(function (d) { return d; });
    
    buttons = e.append('span')
            .attr('class', 'addRemoveButtons');
    buttons.append('a').text('+')
        .attr('class', 'small button')
        .on('click', function (d, i) {
            queries.splice(i + 1, 0, {
                append : d.append,
                attribute: d.attribute,
                queryType : d.queryType,
                queryValue : ''
            });
            update();
        });
    buttons.append('a').text('-')
        .attr('class', 'removeButton small button')
        .on('click', function (d, i) {
            queries.splice(i, 1);
            update();
        });
    if (queries.length === 1) {
        jQuery('.removeButton')[0].setAttribute('disabled', '');
    } else {
        jQuery('.removeButton')[0].removeAttribute('disabled');
    }
    
    d3.selectAll('.queryType').selectAll('option').each(function (d) {
        var queryData = d3.select(this.parentNode.parentNode.parentNode).datum(),
            myType = d3.select(this.parentNode).datum().key,
            attrType = lookupAttrType(queryData.attribute);
        
        // disabled?
        if (attrType === 'Both' || attrType === myType) {
            this.removeAttribute('disabled');
        } else {
            this.setAttribute('disabled', true);
        }
        
        // selected?
        if (d === queryData.queryType) {
            this.setAttribute('selected', '');
        } else {
            this.removeAttribute('selected');
        }
    });
    
    window.illustrator.applyUI();
}

window.scriptLoader.require(['../../common/illustrator.js',
                             '../../common/ui.js'], function () {
    "use strict";
    update();
});