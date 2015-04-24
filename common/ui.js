/*globals window, console, document, jQuery, d3*/
function openNeighborSelectMenu(target) {
    "use strict";
    var e = document.createEvent('MouseEvents');
    e.initMouseEvent('mousedown', true, true, window);
    target.dispatchEvent(e);
}

function addSelectArrows() {
    "use strict";
    jQuery('select').after('<img class="selectArrow" onclick="openNeighborSelectMenu(this.previousSibling)"/>');
}
addSelectArrows();

var resized = 1.5;  // not sure why, but the first time I call updateRows(), I need just
                    // a little less margin on the bottom
function updateRows() {
    "use strict";
    // equally divide up vertical space among expanding divs
    var expanders = jQuery('.expanding:visible'),
        hrHeight = 8,
        rowHeight = 20,
        rowPadding = 8,
        availableHeight;
    if (expanders.length > 0) {
        availableHeight = window.innerHeight;
        availableHeight -= resized * jQuery('.bottom')[0].getBoundingClientRect().height;
        jQuery('hr:visible').each(function (i, e) {
            availableHeight -= e.getBoundingClientRect().height;
        });
        jQuery('.static:visible').each(function (i, e) {
            jQuery(e).height(rowHeight * e.getAttribute('numRows'));
            availableHeight -= e.getBoundingClientRect().height;
            availableHeight -= rowPadding;
        });
        expanders.css('height', availableHeight / expanders.length);
    }
    resized = 2.0;
}
updateRows();
jQuery(window).on('resize', updateRows);