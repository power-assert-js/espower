'use strict';

var SourceMapConsumer = require('source-map').SourceMapConsumer;

function PositionAdjustment (sourceMap) {
    this.sourceMapConsumer = new SourceMapConsumer(sourceMap);
}
PositionAdjustment.prototype.originalPositionFor = function (currentNode) {
    var currentPosition = {
        source: currentNode.loc.source,
        line: currentNode.loc.start.line,
        column: currentNode.loc.start.column
    };
    var found = this.sourceMapConsumer.originalPositionFor(currentPosition);
    return found || currentPosition;
};

function NoAdjustment () {
}
NoAdjustment.prototype.originalPositionFor = function (currentNode) {
    return {
        source: currentNode.loc.source,
        line: currentNode.loc.start.line,
        column: currentNode.loc.start.column
    };
};

module.exports = function (sourceMap) {
    if (sourceMap) {
        return new PositionAdjustment(sourceMap);
    } else {
        return new NoAdjustment();
    }
};
