/*globals window, console, document, jQuery, d3*/
window.scriptLoader.require(['../../common/illustrator.js'], function () {
    "use strict";
    var sliderIndex = 0;
    jQuery('#slider').on('click', function() {
        sliderIndex += 1;
        if (sliderIndex >= 3) {
            sliderIndex = 0;
        }
        this.setAttribute('src', 'sampleSlider' + sliderIndex + '.png');
    });
});