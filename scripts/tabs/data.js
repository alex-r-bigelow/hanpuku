/*jslint evil:true*/
var dataFiles = [],
    dataFileLookup = {},
    supportedFormats = [
        'text/csv',
        'text/tab-separated-values',
        'text/json',
        'text/js'
    ],
    friendlyFormatNames = {
        'text/csv' : 'csv',
        'text/tab-separated-values' : 'tsv',
        'text/json': 'json',
        'text/js' : 'js'
    },
    selectedDataFile = 'header';

function parseData(raw, dataType) {
    var result;
    try {
        if (dataType === 'text/js') {
            result = eval(raw);
        } else if (dataType === 'text/json') {
            result = JSON.parse(raw);
        } else if (dataType === 'text/csv') {
            result = d3.csv.parse(raw);
        } else if (dataType === 'text/tab-separated-values') {
            result = d3.tsv.parse(raw);
        } else {
            throw "Attempted to parse unsupported data type: " + dataType;
        }
    } catch(e) {
        result = e.stack;
        console.warn(result);
    }
    return result;
}

function updateDataPanel() {
    var f,
        currentDataFile = jQuery('#currentDataFile'),
        editor = jQuery('#dataEditor'),
        embedBox = jQuery('#embedFileCheckBox'),
        dataTypeSelect = jQuery('#dataTypeSelect'),
        optionText = "";
    
    jQuery('#dataFileInput').remove();
    jQuery('#dataPanel span').append('<input id="dataFileInput" type="file" onchange="loadDataFiles();" multiple style="visibility:hidden"/>');
    currentDataFile.find('option').remove();
    
    if (dataFiles.length === 0) {
        currentDataFile.append('<option value="header" selected>(no data files loaded)</option>');
        editor.prop('disabled', true);
        editor.val('');
        embedBox.prop('checked', false);
        embedBox.prop('disabled', true);
        dataTypeSelect.prop('disabled', true);
    } else {
        for (f = 0; f < dataFiles.length; f += 1) {
            optionText = '<option value="' + dataFiles[f].name + '"';
            if (selectedDataFile === dataFiles[f].name) {
                optionText += ' selected';
                editor.prop('disabled', false);
                editor.val(dataFiles[f].raw);
                embedBox.prop('disabled', false);
                embedBox.prop('checked', dataFiles[f].embed);
                dataTypeSelect.prop('disabled', false);
                dataTypeSelect.val(dataFiles[f].type);
            }
            optionText += '>' + dataFiles[f].name + '</option>';
            currentDataFile.append(optionText);
        }
    }
    currentDataFile.append('<option value="loadNewFile">Load...</option>');
}

function switchDataFile() {
    var lastFile = selectedDataFile,
        file,
        oldType;
    selectedDataFile = jQuery('#currentDataFile').val();
    
    if (selectedDataFile === 'header') {
        // Do nothing
    } else if (selectedDataFile === 'loadNewFile') {
        // It will take a while for the user to pick some files, so for now,
        // revert back to the previous file in case they don't pick anything
        // that we can load (the loading and panel updating will be fired by dataFileInput's onchange):
        jQuery('#currentDataFile').val(lastFile);
        selectedDataFile = lastFile;
        
        jQuery('#dataFileInput').click();
    } else {
        // If something else brought us here, update the embed and format options
        if (selectedDataFile === lastFile) {
            file = dataFiles[dataFileLookup[selectedDataFile]];
            file.embed = jQuery('#embedFileCheckBox').prop('checked');
            oldType = file.type;
            file.type = jQuery('#dataTypeSelect').val();
            if (oldType !== file.type) {
                file.parsed = parseData(file.raw, file.type);
            }
        }
        updateDataPanel();
    }
}
function loadDataFile(f) {
    var fileReader = new FileReader();
    fileReader.onload = function (e) {
        var fileObj = {
            'name' : f.name,
            'type' : f.type,
            'raw' : e.target.result,
            'parsed' : parseData(e.target.result, f.type),
            'embed' : false
        };
        if (dataFileLookup.hasOwnProperty(f.name)) {
            dataFiles[dataFileLookup[f.name]] = fileObj;
        } else {
            dataFileLookup[f.name] = dataFiles.length;
            dataFiles.push(fileObj);
        }
    };
    fileReader.readAsText(f);
}
function loadDataFiles() {
    var newFiles = jQuery('#dataFileInput')[0].files,
        i,
        warningText,
        warnedAboutFiles = false,
        unloadedFiles = [];
    
    for (i = 0; i < newFiles.length; i += 1) {
        if (supportedFormats.indexOf(newFiles[i].type) === -1) {
            console.log(newFiles[i].type);
            if (warnedAboutFiles === false) {
                warningText = "Sorry, iD3 only supports ";
                supportedFormats.forEach(function (f, index) {
                    if (index !== 0) {
                        warningText += ', ';
                    }
                    if (index === supportedFormats.length-1) {
                        warningText += 'and ';
                    }
                    warningText += friendlyFormatNames[f];
                });
                warningText += " data files.";
                alert(warningText);
                warnedAboutFiles = true;
            }
        } else {
            unloadedFiles.push(newFiles[i].name);
            loadDataFile(newFiles[i]);
            if (selectedDataFile === 'header') {
                selectedDataFile = newFiles[i].name;
            }
        }
    }
    // Update the panel when all the files have finished loading
    function updateWhenLoaded() {
        var f;
        for (f = 0; f < dataFiles.length; f += 1) {
            if (unloadedFiles.indexOf(dataFiles[f].name) !== -1) {
                unloadedFiles.splice(unloadedFiles.indexOf(dataFiles[f].name),1);
            }
        }
        // TODO: add a spinner?
        if (unloadedFiles.length > 0) {
            window.setTimeout(updateWhenLoaded, 200);
        } else {
            updateDataPanel();
        }
    }
    updateWhenLoaded();
}