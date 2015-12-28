'use strict';

var PositionAdjustment = require('./position-adjustment');
var SourceAdjustment = require('./source-adjustment');

function EspowerLocationDetector (options) {
    this.sourceAdjustment = new SourceAdjustment(options.sourceRoot, options.path, options.sourceMap);
    this.positionAdjustment = new PositionAdjustment(options.sourceMap);
}

EspowerLocationDetector.prototype.locationFor = function (currentNode) {
    var pos = this.positionAdjustment.originalPositionFor(currentNode);
    return {
        source: this.sourceAdjustment.relativizeSource(pos),
        line: pos.line,
        column: pos.column
    };
};

module.exports = EspowerLocationDetector;
