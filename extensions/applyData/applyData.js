/*globals window, console, document, jQuery, d3, updateRows, ace*/

var keyEditor,
    d3Editor;

function update() {
    "use strict";
    // set the mode
    var mode = jQuery('input:radio[name=basicOrAdvanced]:checked').val();
    jQuery('.' + mode).show();
    
    if (mode === 'advanced') {
        jQuery('#attribute').val('d3KeyFunction').attr('disabled', true);
    } else {
        jQuery('#attribute').val('rowNumber').attr('disabled', false);
    }
    
    mode = mode === 'advanced' ? 'basic' : 'advanced';
    jQuery('.' + mode).hide();
    
    updateRows();
    
    // tell the editors to refresh
    keyEditor.resize();
    d3Editor.resize();
}

function toggleClassName() {
    "use strict";
    if (jQuery('#remember:checked').length === 1) {
        jQuery('#reapply, #cssClass').attr('disabled', false);
    } else {
        jQuery('#reapply, #cssClass').attr('disabled', true);
        jQuery('#reapply').attr('checked', false);
    }
}

window.scriptLoader.require(['../../common/illustrator.js',
                             '../../common/ui.js'], function () {
    "use strict";
    var x,
        temp;
    keyEditor = ace.edit('keyEditor');
    d3Editor = ace.edit('d3Editor');
    
    window.illustrator.aceEditors.push(keyEditor);
    keyEditor.$blockScrolling = Infinity;
    keyEditor.getSession().setMode("ace/mode/javascript");
    
    window.illustrator.aceEditors.push(d3Editor);
    d3Editor.$blockScrolling = Infinity;
    d3Editor.getSession().setMode("ace/mode/javascript");
    
    for (x = 1; x <= 10; x += 1) {
        temp = d3.select('#symbolView').append('img').attr('src', 'sampleSymbols/' + x + '.png');
        if (x === 7) {
            temp.style('border', '3px solid black');
        }
    }
    d3.select('#symbolView').append('img').attr('src', 'none.png');
    update();
});