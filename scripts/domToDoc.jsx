var doc = JSON.parse(input);

function applyDocument() {
    if (app.documents.length > 0) {
        var activeDoc = app.activeDocument,
            a,
            l;
        
        if (activeDoc.name !== doc.name) {
            alert('Renaming the document is not yet supported.');
        }
        // width and height are read only (determined in Illustrator by the artboards?)
        
        for (a = 0; a < doc.artboards.length; a += 1) {
            
            output.artboards.push({
                name: activeDoc.artboards[a].name,
                rect: activeDoc.artboards[a].artboardRect
            });
            // Illustrator has inverted Y coordinates
            output.artboards[a].rect[1] = -output.artboards[a].rect[1];
            output.artboards[a].rect[3] = -output.artboards[a].rect[3];
        }
        for (l = 0; l < doc.groups.length; l += 1) {
            output.groups.push(extractGroup(activeDoc.layers[l]));
        }
    }
    
    return output;
}