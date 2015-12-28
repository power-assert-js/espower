'use strict';

var _path = require('path');
var isAbsolute = require('path-is-absolute');
var isUrl = require('is-url');

function SourceAdjuster (sourceRoot, path, sourceMap) {
    this.path = path;
    this.sourceRoot = sourceRoot;
    if (typeof sourceMap === 'string') {
        this.sourceMap = JSON.parse(sourceMap.replace(/^\)\]\}'/, ''));
    } else {
        this.sourceMap = sourceMap;
    }
}

SourceAdjuster.prototype.relativize = function (filepathOrUrl, mappedWithSourceMap) {
    var filepath;
    if (mappedWithSourceMap && filepathOrUrl && this.sourceMap) {
        if (this.sourceMap.sourceRoot && isUrl(this.sourceMap.sourceRoot)) {
            filepath = _path.relative(this.sourceMap.sourceRoot, filepathOrUrl);
        } else if (this.sourceRoot && isAbsolute(this.sourceRoot) && isAbsolute(filepathOrUrl)) {
            filepath = _path.relative(this.sourceRoot, filepathOrUrl);
        } else if (this.sourceMap.sourceRoot && isAbsolute(this.sourceMap.sourceRoot) && isAbsolute(filepathOrUrl)) {
            filepath = _path.relative(this.sourceMap.sourceRoot, filepathOrUrl);
        } else if (isUrl(filepathOrUrl)) {
            filepath = _path.basename(filepathOrUrl);
        } else {
            filepath = filepathOrUrl;
        }
    } else {
        var tmpPath = this.path || filepathOrUrl;
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

module.exports = SourceAdjuster;
