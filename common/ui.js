/*globals window, console, document, jQuery, d3*/
function updateExpanders() {
    "use strict";
    // equally divide up vertical space among expanding divs
    var expanders = jQuery('.expanding:visible'),
        availableHeight;
    if (expanders.length > 0) {
        expanders.hide();
        availableHeight = window.innerHeight - jQuery('body')[0].getBoundingClientRect().height - 60;
        expanders.show();
        expanders.css('height', availableHeight / expanders.length);
    }
}

jQuery(window).on('resize', updateExpanders);