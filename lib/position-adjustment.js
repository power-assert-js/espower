'use strict';

var SourceMapConsumer = require('source-map').SourceMapConsumer;
var extend = require('xtend');

function PositionAdjustment (sourceMap) {
    if (sourceMap) {
        this.sourceMapConsumer = new SourceMapConsumer(sourceMap);
    }
}
PositionAdjustment.prototype.originalPositionFor = function (currentNode) {
    var currentPosition = {
        source: currentNode.loc.source,
        line: currentNode.loc.start.line,
        column: currentNode.loc.start.column
    };
    if (this.sourceMapConsumer) {
        var found = this.sourceMapConsumer.originalPositionFor(currentPosition);
        if (found) {
            return extend({ adjusted: true }, found);
        }
    }
    return extend({ adjusted: false }, currentPosition);
};

module.exports = PositionAdjustment;
