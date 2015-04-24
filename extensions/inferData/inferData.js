/*globals window, console, document, jQuery, d3, updateRows, ace*/

var matchingEditor,
    mappingEditor;

function update() {
    "use strict";
    // set the mode
    var mode = jQuery('input:radio[name=newOrMatch]:checked').val();
    jQuery('.' + mode).show();
    
    mode = mode === 'match' ? 'add' : 'match';
    jQuery('.' + mode).hide();
    
    updateRows();
    
    // tell the editors to refresh
    matchingEditor.resize();
    mappingEditor.resize();
}

window.scriptLoader.require(['../../common/illustrator.js',
                             '../../common/ui.js'], function () {
    "use strict";
    matchingEditor = ace.edit('matchingEditor');
    window.illustrator.aceEditors.push(matchingEditor);
    matchingEditor.$blockScrolling = Infinity;
    matchingEditor.getSession().setMode("ace/mode/javascript");
    
    mappingEditor = ace.edit('mappingEditor');
    window.illustrator.aceEditors.push(mappingEditor);
    mappingEditor.$blockScrolling = Infinity;
    mappingEditor.getSession().setMode("ace/mode/javascript");
    
    update();
});