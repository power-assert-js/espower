'use strict';

var _path = require('path');
var isAbsolute = require('path-is-absolute');
var isUrl = require('is-url');
var SourceMapConsumer = require('source-map').SourceMapConsumer;

function SourceAdjustment (sourceRoot, path, sourceMap) {
    this.path = path;
    this.sourceRoot = sourceRoot;
    this.sourceMapConsumer = new SourceMapConsumer(sourceMap);
}
SourceAdjustment.prototype.sourceFor = function (currentNode) {
    var filepath;
    var pos = this.sourceMapConsumer.originalPositionFor({
        line: currentNode.loc.start.line,
        column: currentNode.loc.start.column
    });
    if (pos && pos.source) {
        // console.log(JSON.stringify(pos, null, 2));
        if (this.sourceMapConsumer.sourceRoot && isUrl(this.sourceMapConsumer.sourceRoot)) {
            filepath = _path.relative(this.sourceMapConsumer.sourceRoot, pos.source);
        } else if (this.sourceRoot && isAbsolute(this.sourceRoot) && isAbsolute(pos.source)) {
            filepath = _path.relative(this.sourceRoot, pos.source);
        } else if (this.sourceMapConsumer.sourceRoot && isAbsolute(this.sourceMapConsumer.sourceRoot) && isAbsolute(pos.source)) {
            filepath = _path.relative(this.sourceMapConsumer.sourceRoot, pos.source);
        } else if (isUrl(pos.source)) {
            filepath = _path.basename(pos.source);
        } else {
            filepath = pos.source;
        }
    }
    if (!filepath) {
        var tmpPath = this.path || currentNode.loc.source;
        if (this.sourceRoot && isAbsolute(this.sourceRoot) && isAbsolute(tmpPath)) {
            filepath = _path.relative(this.sourceRoot, tmpPath);
        } else {
            filepath = this.path;
        }
    }
    return fallbackOnBasename(filepath);
};

function NoSourceAdjustment (sourceRoot, path) {
    this.path = path;
    this.sourceRoot = sourceRoot;
}
NoSourceAdjustment.prototype.sourceFor = function (currentNode) {
    var filepath;
    var tmpPath = this.path || currentNode.loc.source;
    if (this.sourceRoot && isAbsolute(this.sourceRoot) && isAbsolute(tmpPath)) {
        filepath = _path.relative(this.sourceRoot, tmpPath);
    } else {
        filepath = this.path;
    }
    return fallbackOnBasename(filepath);
};

function fallbackOnBasename (filepath) {
    if (filepath) {
        if (filepath.split(_path.sep).indexOf('..') !== -1) {
            return _path.basename(filepath);
        } else if (isUrl(filepath)) {
            return _path.basename(filepath);
        } else if (isAbsolute(filepath)) {
            return _path.basename(filepath);
        }
    }
    return filepath;
}

module.exports = function (options) {
    if (options.sourceMap) {
        return new SourceAdjustment(options.sourceRoot, options.path, options.sourceMap);
    } else {
        return new NoSourceAdjustment(options.sourceRoot, options.path);
    }
};
