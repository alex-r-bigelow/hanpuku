/*globals window, console, document, jQuery, d3, FileManager, File, XMLSerializer*/

var manager,
    menu,
    menuParser = new XMLSerializer();

function updateManager() {
    "use strict";
    var fileMenuOptions = d3.select('#currentFile').selectAll('option')
        .data(d3.entries(manager.files));
    fileMenuOptions.enter().append('option');
    fileMenuOptions.exit().remove();

    fileMenuOptions.attr('value', function (d) { return d.key; })
        .text(function (d) {
            if (d.value.saved === false) {
                return '*' + d.key;
            } else {
                return d.key;
            }
        });

    if (manager.currentFile === null) {
        jQuery('#currentFile').append('<option disabled>No files loaded</option>');
        jQuery('#linkCheck').prop('disabled', true);
        jQuery('#format').prop('disabled', true);
    } else {
        jQuery('#currentFile').val(manager.currentFile.name);
        jQuery('#currentFile > option')
            .prop('disabled', false);
        jQuery('#linkCheck')
            .prop('disabled', false)
            .attr('checked', !manager.currentFile.isEmbedded());
        jQuery('#format')
            .prop('disabled', false)
            .val(manager.currentFile.format);
    }
}

function updateMenu(enable) {
    "use strict";
    menu.find('MenuItem').attr('Enabled', enable);
    menu.find('MenuItem[Id=DB], MenuItem[Id=StreamPacket]').attr('Enabled', false);
    window.illustrator.setFlyoutMenu(menuParser.serializeToString(menu[0]));
}

function disableWidget() {
    "use strict";
    jQuery('#currentFile, #linkCheck, #format, #applyButton, .button')
        .off()
        .attr('disabled', '');  // this is a nonstandard way to disable stuff, but
                                // I actually WANT the disabled tags to show up on
                                // things like img, as I use them like buttons
    manager.files = {};
    manager.switchFile(null);
    
    updateMenu(false);
}

function enableWidget() {
    "use strict";
    jQuery('#currentFile, #linkCheck, #format, #applyButton, .button')
        .off()
        .prop('disabled', false);
    manager.refreshFiles();
    updateMenu();

    jQuery('#format').on('change', function () {
        manager.currentFile.setFormat(this.value);
    });

    jQuery('#linkCheck').on('change', function () {
        manager.currentFile.toggleEmbedded();
    });

    jQuery('#searchButton').on('click', function () { manager.search(); });
    jQuery('#newFileButton').on('click', function () { manager.newFile(); });
    jQuery('#trashButton').on('click', function () { manager.deleteFile(); });
    jQuery('#applyButton').on('click', function () { manager.saveFile(); });
    
    updateMenu(true);
}

window.scriptLoader.require(['../../common/illustrator.js',
                             '../../common/ui.js',
                             '../../common/fileManager.js'], function () {
    "use strict";
    d3.xml('menu.xml', 'text/xml', function (error, xml) {
        manager = new FileManager("editor", "data", ["txt",
                                                     "csv",
                                                     "tsv",
                                                     "json",
                                                     "js",
                                                     "xml",
                                                     "html"]);
        manager.onUpdate = updateManager;
        
        menu = jQuery(xml);
        updateMenu(true);
        window.illustrator.on('panelMenuEvent', function (event) {
            if (event.data.menuId === 'New') {
                manager.newFile();
            } else if (event.data.menuId === 'Open') {
                manager.openFile();
            } else if (event.data.menuId === 'Save') {
                manager.saveFile();
            } else if (event.data.menuId === 'SaveAs') {
                manager.saveFileAs();
            } else if (event.data.menuId === 'Rename') {
                manager.renameFile();
            } else if (event.data.menuId === 'Refresh') {
                manager.refreshFile();
            } else if (event.data.menuId === 'Delete') {
                manager.deleteFile();
            } else if (event.data.menuId === 'Find') {
                manager.search();
            }
        });
        
        window.illustrator.on('noFile', disableWidget);
        window.illustrator.on('openFile', enableWidget);
        window.onfocus = function () {
        // Initial test to see if a file is open
            window.illustrator.checkIfFileIsOpen(function (response) {
                if (response === 'true') {
                    enableWidget();
                } else {
                    disableWidget();
                }
            });
        };
        window.onfocus();
    });
});