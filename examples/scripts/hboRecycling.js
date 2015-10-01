/*
    This example (and dataset) were inspired / extracted from this infographic:
    http://grantland.com/features/the-hbo-recycling-program/
*/
var temp,
    shows,
    actors,
    showsToActors,
    actorsToShows,
    allLinks,
    width = 612,
    height = 792,
    top = 75,
    bottom = height - top,
    leftColumn = width / 3.75,
    rightColumn = width - leftColumn;


d3.csv("hboRecyclingMatrix.csv", function (matrixData) {
    temp = matrixData;
    
    shows = Object.keys(temp[0]);
    shows.splice(0,1);
    
    actors = [];
    allLinks = [];
    showsToActors = {};
    actorsToShows = {};
    
    var maxShowLinks = 0,
        maxActorLinks = 0;
    
    temp.forEach(function (d) {
        var a = d[""];
        actors.push(a);
        shows.forEach(function (s) {
            if (showsToActors.hasOwnProperty(s) === false) {
                showsToActors[s] = [];
            }
            if (actorsToShows.hasOwnProperty(a) === false) {
                actorsToShows[a] = [];
            }
            if (d[s] === "1") {
                showsToActors[s].push(a);
                actorsToShows[a].push(s);
                allLinks.push({
                    source : s,
                    target : a
                });
            }
            maxShowLinks = Math.max(maxShowLinks, showsToActors[s].length);
            maxActorLinks = Math.max(maxActorLinks, actorsToShows[a].length);
        });
    });
    
    var groups = d3.select("#Layer_1").selectAll("g").data(['links', 'nodes']);
    groups.enter().append('g')
        .attr('id', function (d) { return d; });
    
    var colorScale = d3.scale.ordinal().domain(shows)
        .range(['#D985B2',
                '#BC4280',
                '#93257B',
                '#742574',
                '#623786',
                '#4C2F80',
                '#394699',
                '#4B5EA0',
                '#4469AF',
                '#5C87C6',
                '#679BB5',
                '#71AC96',
                '#95C498',
                '#82B962',
                '#8BBD53',
                '#9EB83B',
                '#CDDB4F',
                '#EED939',
                '#E3A134',
                '#DB7E2D',
                '#C25E2C',
                '#A9292D',
                '#622229']);
    var showSizes = d3.scale.linear().domain([1, maxShowLinks]).range([2,900]),
        actorSizes = d3.scale.linear().domain([1, maxActorLinks]).range([2,30]);
    
    var verticalShowScale = d3.scale.ordinal().domain(shows).rangeRoundBands([top,bottom], 0.1);
    var verticalActorScale = d3.scale.ordinal().domain(actors).rangeRoundBands([top,bottom], 0.1);
    function getPosition (d) {
        if (showsToActors.hasOwnProperty(d) === true) {
            return [rightColumn, verticalShowScale(d)];
        } else {
            return [leftColumn, verticalActorScale(d)];
        }
    }
    var getTranslation = function (d) {
        var position = getPosition(d);
        return "translate(" + position[0] + "," + position[1] + ")";
    };
    var circleGenerator = d3.svg.symbol().type('circle').size(function (d) {
        if (showsToActors.hasOwnProperty(d) === true) {
            return showSizes(showsToActors[d].length);
        } else {
            return actorSizes(actorsToShows[d].length);
        }
    });
    
    var actorNodes = d3.select("#nodes").selectAll("g.actor").data(actors);
    var newActorNodes = actorNodes.enter().append('g')
        .attr('class', 'actor');
    newActorNodes.append('path');
    newActorNodes.append('text');
    
    actorNodes.exit().remove();
    
    actorNodes.attr("transform", getTranslation);
    actorNodes.select('path')
        .attr('d', circleGenerator)
        .attr('fill', 'black');
    actorNodes.select('text')
        .attr('x', -15)
        .attr('y', '0.25em')
        .attr('text-anchor', 'end')
        .style('font-size', '8px')
        .style('font-family', 'Cooper Hewitt Light')
        .text(function (d) { return d; });
    
    var showNodes = d3.select("#nodes").selectAll("g.show").data(shows);
    var newShowNodes = showNodes.enter().append('g')
        .attr('class', 'actor');
    newShowNodes.append('path');
    newShowNodes.append('text');
    
    showNodes.exit().remove();
    
    showNodes.attr("transform", getTranslation);
    showNodes.select('path')
        .attr('d', circleGenerator)
        .attr("fill", colorScale);
    showNodes.select('text')
        .attr('x', 15)
        .attr('y', '0.25em')
        .style('font-size', '8px')
        .style('font-family', 'Cooper Hewitt Light')
        .text(function (d) { return d; });
    
    var linkLines = d3.select("#links").selectAll("path").data(allLinks);
    linkLines.enter().append("path");
    linkLines.exit().remove();
    
    linkLines.attr("fill", "none")
        .attr("stroke", function (d) {
            return colorScale(d.source);
        })
        .attr("d", function (d) {
            var source = getPosition(d.source),
                target = getPosition(d.target);
            return 'M' + source[0] + ',' + source[1] + 'L' + target[0] + ',' + target[1];
        });
});