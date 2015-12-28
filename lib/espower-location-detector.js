'use strict';

var PositionDetector = require('./position-detector');
var SourceAdjustment = require('./source-adjustment');

function EspowerLocationDetector (options) {
    this.positionDetector = new PositionDetector(options.sourceMap);
    this.sourceAdjustment = new SourceAdjustment(options.sourceRoot, options.path, options.sourceMap);
}

EspowerLocationDetector.prototype.locationFor = function (currentNode) {
    var pos = this.positionDetector.positionFor(currentNode);
    return {
        source: this.sourceAdjustment.relativizeSource(pos),
        line: pos.line,
        column: pos.column
    };
};

module.exports = EspowerLocationDetector;
