/*globals window, console, document, jQuery, d3, updateRows*/
window.scriptLoader.require(['../../common/illustrator.js',
                             '../../common/ui.js'], function () {
    "use strict";
    var sliderIndex = 0;
    jQuery('#slider').on('click', function () {
        sliderIndex += 1;
        if (sliderIndex >= 3) {
            sliderIndex = 0;
        }
        this.setAttribute('src', 'sampleSlider' + sliderIndex + '.png');
    });
    updateRows();
});