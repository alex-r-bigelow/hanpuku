/*globals window, console, document, jQuery, d3*/
function update() {
    "use strict";
    // set the mode
    var mode = jQuery('input:radio[name=newOrMatch]:checked').val();
    jQuery('.' + mode).show();
    
    mode = mode === 'match' ? 'add' : 'match';
    jQuery('.' + mode).hide();
    
    updateExpanders();
}

window.scriptLoader.require(['../../common/illustrator.js',
                             '../../common/ui.js'], function () {
    "use strict";
    update();
});