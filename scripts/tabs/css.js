var cssFiles = {};

function updateCSS() {
    jQuery('#userCSS').remove();
    var style = document.createElement('style');
    style.setAttribute('id','userCSS');
    style.appendChild(document.createTextNode(jQuery('#cssEditor').val()));
    document.head.appendChild(style);
}

function loadCSSFile() {
    var newFile = jQuery('#cssFileInput')[0].files[0],
        fileReader = new FileReader();
    fileReader.onload = function (e) {
        jQuery('#cssEditor').val(e.target.result);
        updateCSS();
    };
    fileReader.readAsText(newFile);
}