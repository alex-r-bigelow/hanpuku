var docName = jQuery('#dom svg')[0].getAttribute('id');
DataFile.LOAD_SAMPLE('samples/scatterplot/data.tsv');
loadSampleCodeFile('samples/scatterplot/script.js', docName);
loadSampleCSSFile('samples/scatterplot/style.css');