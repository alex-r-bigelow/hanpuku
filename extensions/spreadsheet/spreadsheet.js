/*globals window, console, document, jQuery, d3*/
var selection = true;
function update() {
    "use strict";
    selection = !selection;
    if (selection === true) {
        jQuery('.selection').show();
        jQuery('.data').hide();
    } else {
        jQuery('.data').show();
        jQuery('.selection').hide();
    }
}

window.scriptLoader.require(['../../common/illustrator.js',
                             '../../common/ui.js'], function () {
    "use strict";
    jQuery('input').on('change', update);
    update();
});