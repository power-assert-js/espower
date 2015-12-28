'use strict';

var SourceMapConsumer = require('source-map').SourceMapConsumer;

function PositionAdjustment (sourceMap) {
    this.sourceMapConsumer = new SourceMapConsumer(sourceMap);
}
PositionAdjustment.prototype.locationFor = function (currentNode) {
    var startLoc = this.positionFor(currentNode.loc.start);
    var endLoc = this.positionFor(currentNode.loc.end);
    return {
        start: startLoc,
        end: endLoc
    };
};
PositionAdjustment.prototype.positionFor = function (position) {
    var lineNum = position.line;
    var columnNum = position.column;
    var pos = this.sourceMapConsumer.originalPositionFor({
        line: lineNum,
        column: columnNum
    });
    if (pos) {
        if (pos.line) {
            lineNum = pos.line;
        }
        if (pos.column) {
            columnNum = pos.column;
        }
    }
    return { line: lineNum, column: columnNum };
};

function NoAdjustment () {
}
NoAdjustment.prototype.locationFor = function (currentNode) {
    return currentNode.loc;
};

module.exports = function (sourceMap) {
    if (sourceMap) {
        return new PositionAdjustment(sourceMap);
    } else {
        return new NoAdjustment();
    }
};
