jQuery('#jsEditor').val("selectedIDs = [];\n\n" +
"d3.selectAll('.dot').each(function (d) {\n" +
"    if (d.sepalLength > 6.9) {\n" +
"        selectedIDs.push(this.getAttribute('id'));\n" +
"    }\n" +
"});");