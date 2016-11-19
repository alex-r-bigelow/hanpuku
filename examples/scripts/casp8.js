/* globals d3 */

var GENE_PADDING = 30000;
var LABEL_PADDING = 18;
// var xhtmlns = 'http://www.w3.org/1999/xhtml';
var GLYPH_RADIUS = 3;

function getScales (domains, ranges) {
  var result = [];
  var i;
  for (i = 0; i < domains.length; i += 1) {
    result.push(d3.scale.linear()
    .domain(domains[i])
    .range(ranges[i]));
  }
  return result;
}

function drawTriangle (g) {
  g.append('path')
  .attr('class', 'glyph')
  .attr('d', 'M0,-' + GLYPH_RADIUS +
  'L' + GLYPH_RADIUS + ',' + GLYPH_RADIUS +
  'L-' + GLYPH_RADIUS + ',' + GLYPH_RADIUS +
  'L0,-' + GLYPH_RADIUS);
}
function drawX (g) {
  g.append('path')
  .attr('class', 'glyph')
  .attr('d', 'M-3,-3L3,3');
  g.append('path')
  .attr('class', 'glyph')
  .attr('d', 'M-3,3L3,-3');
}
function drawCircle (g) {
  g.append('circle')
  .attr('class', 'glyph')
  .attr('cx', 0)
  .attr('cy', 0)
  .attr('r', GLYPH_RADIUS);
}

function VisComponent (containerId) {
  var self = this;
  self.containerId = containerId;
}
VisComponent.prototype.render = function (domains, ranges, bounds) {
  var self = this;
  self.container = d3.select('#' + self.containerId);
  if (self.container.size() === 0) {
    self.container = d3.select('#Layer_1').append('g')
      .attr('id', self.containerId);
  }

  var usingNativeBounds = false;
  if (!bounds) {
    bounds = self.container.node().getBoundingClientRect();
    if (bounds) {
      usingNativeBounds = true;
    } else {
      bounds = {
        x: 0,
        y: 0,
        width: 800,
        height: 200
      };
    }
  }
  self.x = bounds.x;
  self.y = bounds.y;
  self.width = bounds.width;
  self.height = bounds.height;
  if (!usingNativeBounds) {
    self.container.attr('transform', 'translate(' + self.x + ',' + self.y + ')');
  }

  self.scales = getScales(domains, ranges);
  self.sections = self.container.selectAll('g.section').data(self.scales);
  self.sectionsEnter = self.sections.enter().append('g')
    .attr('class', 'section');
  self.sections.exit().remove();
};

function Xaxis (containerId) {
  var self = this;
  VisComponent.call(self, containerId);
}
Xaxis.prototype = Object.create(VisComponent.prototype);
Xaxis.prototype.constructor = Xaxis;

Xaxis.prototype.render = function (domains, ranges, bounds) {
  var self = this;
  VisComponent.prototype.render.call(self, domains, ranges, bounds);

  self.sections.each(function (scale, i) {
    var axis = d3.svg.axis()
      .scale(scale)
      .ticks(Math.floor((scale.range()[1] - scale.range()[0]) / 75))
      .orient('bottom');
    d3.select(this)
      .attr('class', 'axis section')
      .call(axis);
  });
};

function Yaxis (containerId) {
  var self = this;
  VisComponent.call(self, containerId);
}
Yaxis.prototype = Object.create(VisComponent.prototype);
Yaxis.prototype.constructor = Yaxis;

Yaxis.prototype.render = function (domains, ranges, bounds) {
  var self = this;
  VisComponent.prototype.render.call(self, domains, ranges, bounds);

  self.sections.each(function (scale, i) {
    var axis = d3.svg.axis()
      .scale(scale)
      .ticks(4)
      .orient('left');
    d3.select(this)
      .attr('class', 'axis section')
      .call(axis);
  });
};

function GeneTrack (containerId, data) {
  var self = this;
  VisComponent.call(self, containerId);

  self.data = data;

  var lastStops = [];

  for (var i = 0; i < data.length; i += 1) {
    var temp = false;
    for (var j = 0; j < lastStops.length; j += 1) {
      if (lastStops[j] < data[i].start) {
        lastStops[j] = data[i].stop + GENE_PADDING;
        temp = true;
        data[i].row = j;
        break;
      }
    }
    if (temp === false) {
      data[i].row = lastStops.length;
      lastStops.push(data[i].stop + GENE_PADDING);
    }
  }

  self.numRows = lastStops.length;
}
GeneTrack.prototype = Object.create(VisComponent.prototype);
GeneTrack.prototype.constructor = GeneTrack;

GeneTrack.prototype.render = function (domains, ranges, bounds) {
  var self = this;
  VisComponent.prototype.render.call(self, domains, ranges, bounds);

  function checkIfInRange (d, scale) {
    return d.stop >= scale.domain()[0] && d.start <= scale.domain()[1];
  }
  function getGeneName (d) {
    var result = d.name;
    if (d.direction === '-') {
      result = '\u2190 ' + result;  // Unicode left arrow
    } else {
      result = result + ' \u2192';  // Unicode right arrow
    }
    return result;
  }
  function getExons (d, scale) {
    return d.exons.filter(function (d) { return checkIfInRange(d, scale); });
  }
  var rowHeight = self.height / self.numRows - LABEL_PADDING;
  function getGeneTransform (d) {
    return 'translate(0,' + d.row * (LABEL_PADDING + rowHeight) + ')';
  }
  function getBarStart (d, scale) {
    return Math.max(scale.range()[0], Math.floor(scale(d.start)));
  }
  function getBarEnd (d, scale) {
    return Math.min(scale.range()[1], Math.ceil(scale(d.stop)));
  }
  function getBarWidth (d, scale) {
    return getBarEnd(d, scale) - getBarStart(d, scale);
  }

  self.sections.each(function (xScale) {
    var genesInRange = self.data.filter(function (d) { return checkIfInRange(d, xScale); });
    var genes = d3.select(this).selectAll('.gene')
      .data(genesInRange, getGeneName);
    var genesEnter = genes.enter().append('g')
      .attr('class', 'gene');
    genes.attr('transform', getGeneTransform);

    genesEnter.append('rect')
      .attr('class', 'centerLine');
    genes.select('rect.centerLine')
      .attr('x', function (d) { return getBarStart(d, xScale); })
      .attr('y', LABEL_PADDING + rowHeight / 2)
      .attr('width', function (d) { return getBarWidth(d, xScale); })
      .attr('height', 1);

    var exons = genes.selectAll('.exon')
      .data(function (d) { return getExons(d, xScale); });
    exons.enter().append('rect')
      .attr('class', 'exon');
    exons.attr('x', function (d) { return getBarStart(d, xScale); })
      .attr('y', LABEL_PADDING)
      .attr('width', function (d) { return getBarWidth(d, xScale); })
      .attr('height', rowHeight);
  });
};

function MinusLog10Plot (containerId, data, drawGlyph) {
  var self = this;
  VisComponent.call(self, containerId);
  self.data = data;
  self.attribute = containerId;
  self.drawGlyph = drawGlyph;
}
MinusLog10Plot.prototype = Object.create(VisComponent.prototype);
MinusLog10Plot.prototype.constructor = MinusLog10Plot;

MinusLog10Plot.prototype.render = function (domains, ranges, bounds, yRangeTop) {
  var self = this;
  VisComponent.prototype.render.call(self, domains, ranges, bounds);

  self.verticalScale = d3.scale.linear()
    .domain([0, yRangeTop])
    .range([self.height, 0]);

  function checkIfInRange (d, scale) {
    return isNaN(Number(d[self.attribute])) === false &&
      d.Position >= scale.domain()[0] && d.Position <= scale.domain()[1];
  }
  function getGroupTransform (d, scale) {
    return 'translate(' + scale(d.Position) +
      ',' + self.verticalScale(Number(d[self.attribute])) + // self.verticalScale(minusLog10(Number(d[attrib])))
    ')';
  }

  self.sections.each(function (xScale) {
    var relevantData = self.data.filter(function (d) { return checkIfInRange(d, xScale); });
    var points = d3.select(this).selectAll('.scatterPoint')
      .data(relevantData);
    points.enter().append('g')
      .attr('class', 'scatterPoint ' + self.attribute);
    points.attr('transform', function (d) { return getGroupTransform(d, xScale); });
    points.each(function (d) {
      self.drawGlyph(d3.select(this));
    });
    points.exit().remove();
  });
};

function drawFigure2 (fig2data, genedata) {
  var bounds = {
    x: 75,
    y: 10,
    width: 600,
    height: 100
  };

  var domains = [
    [202110000, 202210000]
  ];
  var ranges = [
    [0, bounds.width]
  ];
  var genes = ['CFLAR', 'CASP10', 'CASP8'];

  GLYPH_RADIUS = 2;

  bounds.y = 10;
  bounds.height = 100;

  var temp = new MinusLog10Plot('DNAseq', fig2data, drawX);
  temp.render(domains, ranges, bounds, 20);

  var verticalScale = temp.verticalScale;
  temp = new Yaxis('yAxis');
  temp.render([verticalScale.domain()], [verticalScale.range()], bounds);

  bounds.y += bounds.height;
  bounds.height = 20;

  temp = new Xaxis('xAxis');
  temp.render(domains, ranges, bounds);

  bounds.y += bounds.height + 10;
  bounds.height = 200;

  var widestDomain;
  genes.forEach(function (g) {
    temp = new MinusLog10Plot(g + 'normal', fig2data, drawCircle);
    temp.render(domains, ranges, bounds, 5);
    if (!widestDomain) {
      widestDomain = temp.verticalScale.domain();
    } else {
      widestDomain = [
        Math.min(temp.verticalScale.domain()[0], widestDomain[0]),
        Math.max(temp.verticalScale.domain()[1], widestDomain[1])
      ];
    }
    temp = new MinusLog10Plot(g + 'tumor', fig2data, drawTriangle);
    temp.render(domains, ranges, bounds, 5, false);
    widestDomain = [
      Math.min(temp.verticalScale.domain()[0], widestDomain[0]),
      Math.max(temp.verticalScale.domain()[1], widestDomain[1])
    ];
  });

  verticalScale = temp.verticalScale;
  temp = new Yaxis('yAxis2');
  temp.render([widestDomain], [[bounds.height, 0]], bounds);

  bounds.y += bounds.height;
  bounds.height = 20;

  temp = new Xaxis('xAxis2');
  temp.render(domains, ranges, bounds);

  bounds.y += bounds.height + 10;
  bounds.height = 80;

  temp = new GeneTrack('genes', genedata);
  temp.render(domains, ranges, bounds);
}
d3.csv('fig2.csv', function (fig2data) {
  d3.json('genes.json', function (genes) {
    drawFigure2(fig2data, genes);
  });
});
