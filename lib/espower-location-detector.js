'use strict';

var adjustNodePosition = require('./position-adjustment');
var adjustNodeSource = require('./source-adjustment');

function EspowerLocationDetector (options) {
    this.sourceAdjustment = adjustNodeSource(options);
    this.positionAdjustment = adjustNodePosition(options.sourceMap);
}

EspowerLocationDetector.prototype.locationFor = function (currentNode) {
    return {
        source: this.sourceAdjustment.sourceFor(currentNode),
        line: this.positionAdjustment.locationFor(currentNode).start.line
    };
};

module.exports = EspowerLocationDetector;
