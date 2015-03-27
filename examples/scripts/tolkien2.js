function sauronInflectionLineGenerator(sourceList, direction, accessorNameFunction) {
    if (accessorNameFunction === undefined) {
        accessorNameFunction = function (s) { return s.name; };
    }
    if (direction === undefined) {
        direction = 'horizontal';
    }
    return function (link) {
        var sourceIndex = sourceList.indexOf(accessorNameFunction(link.source)),
            medianIndex = sourceList.length % 2 === 0 ? sourceList.length / 2 : Math.floor(sourceList.length / 2),
            inflectionDisplacement,
            c,
            l,
            phi,
            i;
        if (sourceIndex > medianIndex) {
            inflectionDisplacement = 0.125 + 1.5 * (sourceIndex - Math.ceil(medianIndex)) / sourceList.length;
        } else {
            inflectionDisplacement = 0.125 + 1.5 * (Math.floor(medianIndex) - sourceIndex) / sourceList.length;
        }
        c = { x : link.target.x + (link.source.x - link.target.x) * inflectionDisplacement,
              y : link.target.y + (link.source.y - link.target.y) * inflectionDisplacement };
        i = direction === 'horizontal' ? { x : c.x, y : link.source.y } : { x : link.source.x, y : c.y };
        return 'M' + link.source.x + ',' + link.source.y +
               'C' + i.x + ',' + i.y + ',' +
                     c.x + ',' + c.y + ',' +
                     link.target.x + ',' + link.target.y;
    };
}

var artboardBounds = jQuery('.artboard')[0].getBoundingClientRect();

var margin = 40,
    width = artboardBounds.width,
    protagonistColumn = width / 4,
    bookColumn = width / 2,
    antagonistColumn = 3 * width / 4,
    height = artboardBounds.height,
    textPadding = 20;

var color = d3.scale.category20();

var svg = d3.select('#Layer_1');

d3.csv("middleEarthCharacters.csv", function (graph) {
    // Books
    var bookList = Object.keys(graph[0]);
    bookList.splice(bookList.indexOf("Character"), 1);
    bookList.splice(bookList.indexOf("Role"), 1);
    
    var bookScale = d3.scale.ordinal()
        .domain(bookList)
        .rangePoints([margin, height - margin], 1.0);
    
    var bookNodes = [],
        bookLookup = {};
    bookList.forEach(function (d) {
        bookNodes.push({
            name : d,
            x : bookColumn,
            y : bookScale(d)
        });
        bookLookup[d] = bookNodes[bookNodes.length - 1];
    });
    
    var books = svg.selectAll(".book")
        .data(bookNodes, function (d) { return d.name; });
    var booksEnter = books.enter().append("g")
        .attr("class", "book");
    books.exit().remove();
    booksEnter.append("text")
        .text(function (d) { return d.name; })
        .style("text-anchor", "middle");
    books.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });
    
    // Extract Characters as Nodes
    function alphabeticOrder (a, b) {
        return a.Character.localeCompare(b.Character);
    }
    var protagonistNodes = graph
            .filter(function (d) { return d.Role === 'Protagonist'; })
            .sort(alphabeticOrder),
        antagonistNodes = graph
            .filter(function (d) { return d.Role === 'Antagonist'; })
            .sort(alphabeticOrder);
    
    // Calculate Character Positions
    var protagonistList = [],
        antagonistList = [];
    protagonistNodes.forEach(function (d) { protagonistList.push(d.Character); });
    antagonistNodes.forEach(function (d) { antagonistList.push(d.Character); });
    
    var protagonistScale = d3.scale.ordinal()
            .domain(protagonistList)
            .rangePoints([margin, height - margin, 1.0]),
        antagonistScale = d3.scale.ordinal()
            .domain(antagonistList)
            .rangePoints([margin, height - margin, 1.0]);
    
    protagonistNodes.forEach(function (d) {
        d.x = protagonistColumn;
        d.y = protagonistScale(d.Character);
    });
    antagonistNodes.forEach(function (d) {
        d.x = antagonistColumn;
        d.y = antagonistScale(d.Character);
    });
    
    // Draw Characters
    var protagonists = svg.selectAll(".protagonist")
        .data(protagonistNodes, function (d) { return d.Character; });
    var protagonistsEnter = protagonists.enter().append("g")
        .attr("class", "protagonist");
    protagonists.exit().remove();
    protagonistsEnter.append("text")
        .text(function (d) { return d.Character; })
        .style("text-anchor", "end");
    protagonists.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });
    
    // Antagonists
    var antagonists = svg.selectAll(".antagonist")
        .data(antagonistNodes, function (d) { return d.Character; });
    var antagonistsEnter = antagonists.enter().append("g")
        .attr("class", "antagonist");
    antagonists.exit().remove();
    antagonistsEnter.append("text")
        .text(function (d) { return d.Character; })
        .style("text-anchor", "start");
    antagonists.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });
    
    // Extract Links
    var linkList = [],
        makeLink = function (d) {
            var bookTitle;
            for (bookTitle in d) {
                if (d.hasOwnProperty(bookTitle) && d[bookTitle] === '1') {
                    linkList.push({
                        source : bookLookup[bookTitle],
                        target : d
                    });
                }
            }
        };
    protagonistNodes.forEach(makeLink);
    antagonistNodes.forEach(makeLink);
    
    // Line generator
    var line = sauronInflectionLineGenerator(bookList);
    
    // Draw links
    var links = svg.selectAll(".link")
        .data(linkList);
    links.enter().append("path")
        .attr("class", "link")
        .attr("d", line);
});