/*globals app*/
function escapeRegExp(str) {
    "use strict";
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\!\.\\\^\$\|]/g, "\\$&");
    // stolen (with some changes) from http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
}

function getDataObject() {
    "use strict";
    var doc,
        dataObj;
    
    try {
        doc = app.activeDocument;
    } catch (e) {
        throw new Error("No document open.");
    }
    
    // TODO: I should probably store this stuff in doc.XMPString
    
    try {
        dataObj = doc.groupItems.getByName('hanpuku_data_files');
    } catch (e2) {
        dataObj = doc.groupItems.add();
        dataObj.name = 'hanpuku_data_files';
    }
    
    return dataObj;
}

function fileExists(fileRole, fileName) {
    "use strict";
    var dataObj = getDataObject();
    try {
        dataObj.tags.getByName('linked_' + fileRole + '_' + escapeRegExp(fileName));
        return true;
    } catch (e) {
        try {
            dataObj.tags.getByName('embedded_' + fileRole + '_' + escapeRegExp(fileName));
            return true;
        } catch (e2) {
            return false;
        }
    }
}

function getFileList(fileRole) {
    "use strict";
    var dataObj = getDataObject(),
        i,
        result = [];
    for (i = 0; i < dataObj.tags.length; i += 1) {
        if (dataObj.tags[i].name.search('embedded_' + fileRole) === 0) {
            result.push({
                name : dataObj.tags[i].name.substring(9 + fileRole.length + 1),
                embedded : true
            });
        }
        if (dataObj.tags[i].name.search('linked_' + fileRole) === 0) {
            result.push({
                name : dataObj.tags[i].name.substring(7 + fileRole.length + 1),
                embedded : false
            });
        }
    }
    return result;
}

function readEmbeddedFile(fileRole, fileName) {
    "use strict";
    var dataObj = getDataObject(),
        fileTag;
    try {
        fileTag = dataObj.tags.getByName('embedded_' + fileRole + '_' + escapeRegExp(fileName));
        return fileTag.value;
    } catch (e) {
        throw new Error("File could not be read: " + fileRole + ", " + fileName);
    }
}

function writeEmbeddedFile(fileRole, fileName, contents) {
    "use strict";
    var dataObj = getDataObject(),
        fileTag;
    try {
        fileTag = dataObj.tags.getByName('embedded_' + fileRole + '_' + escapeRegExp(fileName));
    } catch (e) {
        fileTag = dataObj.tags.add();
        fileTag.name = 'embedded_' + fileRole + '_' + escapeRegExp(fileName);
    }
    fileTag.value = contents;
}

function deleteEmbeddedFile(fileRole, fileName) {
    "use strict";
    var dataObj = getDataObject(),
        fileTag;
    try {
        fileTag = dataObj.tags.getByName('embedded_' + fileRole + '_' + escapeRegExp(fileName));
        fileTag.remove();
    } catch (e) {
        throw new Error("Embedded file could not be deleted: " + fileRole + ", " + fileName);
    }
}

function addLinkedFile(fileRole, fileName, path) {
    "use strict";
    var dataObj = getDataObject(),
        fileTag;
    try {
        fileTag = dataObj.tags.getByName('linked_' + fileRole + '_' + escapeRegExp(fileName));
    } catch (e) {
        fileTag = dataObj.tags.add();
        fileTag.name = 'linked_' + fileRole + '_' + escapeRegExp(fileName);
    }
    fileTag.value = path;
}

function getFileLink(fileRole, fileName) {
    "use strict";
    var dataObj = getDataObject(),
        fileTag;
    try {
        fileTag = dataObj.tags.getByName('linked_' + fileRole + '_' + escapeRegExp(fileName));
        return fileTag.value;
    } catch (e) {
        throw new Error("No link for file: " + fileRole + ", " + fileName);
    }
}

function removeLinkedFile(fileRole, fileName) {
    "use strict";
    var dataObj = getDataObject(),
        fileTag;
    try {
        fileTag = dataObj.tags.getByName('linked_' + fileRole + '_' + escapeRegExp(fileName));
        fileTag.remove();
    } catch (e) {
        throw new Error("Linked file could not be removed: " + fileRole + ", " + fileName);
    }
}