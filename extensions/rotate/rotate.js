/*globals window, console, document, jQuery, d3, updateRows*/
var linear = false;

function update() {
    "use strict";
    linear = !linear;
    
    var url = linear === true ? 'sampleSlider0.svg' : 'sampleSlider1.svg';
    jQuery.get(url, { "_": jQuery.now()}, function (data) {
        // Get the SVG tag, ignore the rest
        var slider = jQuery('#slider'),
            svg = jQuery(data).find('svg'),
            width = slider.attr('width'),
            height = slider.attr('height');
        
        svg = svg.removeAttr('xmlns');
        svg = svg.removeAttr('xmlns:xlink');
        svg = svg.removeAttr('xmlns:a');
        svg = svg.removeAttr('xml:space');
        svg = svg.removeAttr('enable-background');
        svg = svg.removeAttr('viewBox');
        svg = svg.removeAttr('version');

        slider.replaceWith(svg);
        
        svg.attr('id', 'slider');
        svg.attr('width', width);
        svg.attr('height', height);
        
        // add the new event handlers
        jQuery('polygon').on('click', function () {
            jQuery('polygon').attr('fill', '#bcbcbc').attr('stroke', '#333333');
            this.setAttribute('fill', '#333333');
            this.setAttribute('stroke', '#bcbcbc');
            
            jQuery('#valueEdit').val(this.getAttribute('class'));
        });
        
    }, 'xml');
    
    updateRows();
}

window.scriptLoader.require(['../../common/illustrator.js',
                             '../../common/ui.js'], function () {
    "use strict";
    jQuery('#scale').on('change', update);
    update();
});