/*globals window, console, document, jQuery, d3, updateExpanders*/

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
    
    updateExpanders();
}

window.scriptLoader.require(['../../common/illustrator.js',
                             '../../common/ui.js'], function () {
    "use strict";
    var x;
    for (x = 1; x <= 10; x += 1) {
        var temp = d3.select('#symbolView').append('img').attr('src', 'sampleSymbols/' + x + '.png');
        if (x === 7) {
            temp.style('border','3px solid black');
        }
    }
    d3.select('#symbolView').append('img').attr('src', 'none.png');
    update();
});