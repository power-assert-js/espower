'use strict';

var _path = require('path');
var isAbsolute = require('path-is-absolute');
var isUrl = require('is-url');
var SourceMapConsumer = require('source-map').SourceMapConsumer;

function SourceAdjustment (sourceRoot, path, sourceMap) {
    this.path = path;
    this.sourceRoot = sourceRoot;
    if (typeof sourceMap === 'string') {
        this.sourceMap = JSON.parse(sourceMap.replace(/^\)\]\}'/, ''));
    } else {
        this.sourceMap = sourceMap;
    }
}

SourceAdjustment.prototype.relativizeSource = function (pos) {
    var filepath;
    if (pos.adjusted && pos.source && this.sourceMap) {
        if (this.sourceMap.sourceRoot && isUrl(this.sourceMap.sourceRoot)) {
            filepath = _path.relative(this.sourceMap.sourceRoot, pos.source);
        } else if (this.sourceRoot && isAbsolute(this.sourceRoot) && isAbsolute(pos.source)) {
            filepath = _path.relative(this.sourceRoot, pos.source);
        } else if (this.sourceMap.sourceRoot && isAbsolute(this.sourceMap.sourceRoot) && isAbsolute(pos.source)) {
            filepath = _path.relative(this.sourceMap.sourceRoot, pos.source);
        } else if (isUrl(pos.source)) {
            filepath = _path.basename(pos.source);
        } else {
            filepath = pos.source;
        }
    } else {
        var tmpPath = this.path || pos.source;
        if (this.sourceRoot && isAbsolute(this.sourceRoot) && isAbsolute(tmpPath)) {
            filepath = _path.relative(this.sourceRoot, tmpPath);
        } else {
            filepath = this.path;
        }
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

module.exports = SourceAdjustment;
