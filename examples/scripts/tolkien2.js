function sauronInflectionLineGenerator(sourceList, direction, accessorNameFunction) {
    // The main idea behind this is to bundle the links connected to the middle of the sourceList
    // so that they separate far away, and have the links connected to the ends of the sourceList
    // separate close to the sourceList. If the sourceList is a vertical line, and there are two
    // lists to either side, it should look like Sauron's eye in Lord of the Rings
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
            inflectionDisplacement = 0.05 + 1.9 * (sourceIndex - Math.ceil(medianIndex)) / sourceList.length;
        } else {
            inflectionDisplacement = 0.05 + 1.9 * (Math.floor(medianIndex) - sourceIndex) / sourceList.length;
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
    height = artboardBounds.height,
    characterCol = width / 4,
    bookCol = 5 * width / 8,
    textPadding = 10;

var color = d3.scale.category20();

var svg = d3.select('#Layer_1');

d3.csv("middleEarthCharactersSmall.csv", function (graph) {
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
            x : bookCol,
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
        .attr("x", textPadding)
        .style("text-anchor", "start");
    books.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });
    
    // Extract Characters as Nodes
    function alphabeticOrder (a, b) {
        return a.Character.localeCompare(b.Character);
    }
    var characterNodes = graph
            .sort(alphabeticOrder);
    
    // Calculate Character Positions
    var characterList = [];
    characterNodes.forEach(function (d) { characterList.push(d.Character); });
    
    var characterScale = d3.scale.ordinal()
            .domain(characterList)
            .rangePoints([margin, height - margin, 1.0]);
    
    characterNodes.forEach(function (d) {
        d.x = characterCol;
        d.y = characterScale(d.Character);
    });
    
    // Draw Characters
    var characters = svg.selectAll(".character")
        .data(characterNodes, function (d) { return d.Character; });
    var charactersEnter = characters.enter().append("g")
        .attr("class", "character");
    characters.exit().remove();
    charactersEnter.append("text")
        .text(function (d) { return d.Character; })
        .attr("x", -textPadding)
        .style("text-anchor", "end")
        .style("fill", function (d) { return d.Role === 'Protagonist' ? '#aaa' : '#000'; });
    characters.attr("transform", function (d) {
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
    characterNodes.forEach(makeLink);
    
    // Line generator
    var line = sauronInflectionLineGenerator(bookList, 'horizontal');
    
    // Draw links
    var links = svg.selectAll(".link")
        .data(linkList, function (d) { return d.source.name + d.target.Character; });
    var linkEnter = links.enter().append("path")
        .attr("class", "link")
        .style("stroke", function (d) { return d.target.Role === 'Protagonist' ? '#aaa' : '#000'; });
    links.attr("d", line);
    links.exit().remove();
});