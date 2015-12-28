'use strict';

var PositionDetector = require('./position-detector');
var SourceAdjuster = require('./source-adjuster');

function EspowerLocationDetector (options) {
    this.positionDetector = new PositionDetector(options.sourceMap);
    this.sourceAdjuster = new SourceAdjuster(options.sourceRoot, options.path, options.sourceMap);
}

EspowerLocationDetector.prototype.locationFor = function (currentNode) {
    var pos = this.positionDetector.positionFor(currentNode);
    return {
        source: this.sourceAdjuster.relativize(pos.source, pos.mapped),
        line: pos.line,
        column: pos.column
    };
};

module.exports = EspowerLocationDetector;
