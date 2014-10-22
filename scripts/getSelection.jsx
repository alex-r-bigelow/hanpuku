var selectedIDs = [],
    i;

if (app.documents.length > 0)
{
    for (i = 0; i < app.activeDocument.selection.length; i += 1) {
        if (!app.activeDocument.selection[i].name) {
            selectedIDs.push('noname');
        } else {
            selectedIDs.push(app.activeDocument.selection[i].name);
        }
    }
}
JSON.stringify(selectedIDs);