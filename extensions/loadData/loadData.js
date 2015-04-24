/*globals window, console, document, jQuery, d3, FileManager, File*/

window.scriptLoader.require(['../../common/illustrator.js',
                             '../../common/ui.js',
                             '../../common/fileManager.js'], function () {
    "use strict";
    var manager = new FileManager("editor", "data", ["txt",
                                                     "csv",
                                                     "tsv",
                                                     "json",
                                                     "js",
                                                     "xml",
                                                     "html"]);
    
    manager.onUpdate = function () {
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
    };
    
    function disableWidget() {
        jQuery('#currentFile, #linkCheck, #format, #applyButton, .button')
            .off()
            .attr('disabled', '');  // this is a nonstandard way to disable stuff, but
                                    // I actually WANT the disabled tags to show up on
                                    // things like img, as I use them like buttons
        manager.files = {};
        manager.switchFile(null);
    }

    function enableWidget() {
        jQuery('#currentFile, #linkCheck, #format, #applyButton, .button')
            .off()
            .prop('disabled', false);
        manager.refreshFiles();

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
    }
    
    window.illustrator.setFlyoutMenu('<Menu>' +
        '<MenuItem Id="New" Label="New" Enabled="true" Checked="false"/>' +
        
        '<MenuItem Label="---" />' +
        
        '<MenuItem Id="Open" Label="Open..." Enabled="true" Checked="false"/>' +
        '<MenuItem Id="DB" Label="Get Database Query..." Enabled="false" Checked="false"/>' +
        '<MenuItem Id="StreamPacket" Label="Get Packet From Stream..." Enabled="false" Checked="false"/>' +
        
        '<MenuItem Label="---" />' +
        
        '<MenuItem Id="Save" Label="Save" Enabled="true" Checked="false"/>' +
        '<MenuItem Id="SaveAs" Label="Save As..." Enabled="true" Checked="false"/>' +
        
        '<MenuItem Label="---" />' +
        
        '<MenuItem Id="Rename" Label="Rename..." Enabled="true" Checked="false"/>' +
        '<MenuItem Id="Refresh" Label="Refresh" Enabled="true" Checked="false"/>' +
        '<MenuItem Id="Delete" Label="Delete" Enabled="true" Checked="false"/>' +
        
        '<MenuItem Label="---" />' +
        
        '<MenuItem Id="Find" Label="Find..." Enabled="true" Checked="false"/>' +
        '</Menu>');
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
    }
    window.onfocus();
});