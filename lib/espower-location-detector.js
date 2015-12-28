'use strict';

var adjustNodePosition = require('./position-adjustment');
var adjustNodeSource = require('./source-adjustment');

function EspowerLocationDetector (options) {
    this.sourceAdjustment = adjustNodeSource(options);
    this.positionAdjustment = adjustNodePosition(options.sourceMap);
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
