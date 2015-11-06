'use strict';

var estraverse = require('estraverse');
var escodegen = require('escodegen');
var espurify = require('espurify');
var espurifyWithRaw = espurify.customize({extra: 'raw'});
var isArray = require('isarray');
var deepEqual = require('deep-equal');
var syntax = estraverse.Syntax;
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var EspowerError = require('./espower-error');
var toBeSkipped = require('./rules/to-be-skipped');
var toBeCaptured = require('./rules/to-be-captured');
var canonicalCodeOptions = {
    format: {
        indent: {
            style: ''
        },
        newline: ''
    },
    verbatim: 'x-verbatim-espower'
};
var _path = require('path');
var isAbsolute = require('path-is-absolute');
var isUrl = require('is-url');

function astEqual (ast1, ast2) {
    return deepEqual(espurify(ast1), espurify(ast2));
}

function AssertionVisitor (matcher, assertionPath, enclosingFunc, options) {
    this.matcher = matcher;
    this.assertionPath = [].concat(assertionPath);
    this.options = options || {};
    if (this.options.sourceMap) {
        this.sourceMapConsumer = new SourceMapConsumer(this.options.sourceMap);
    }
    this.currentArgumentPath = null;
    this.argumentModified = false;
    this.withinGenerator = enclosingFunc && enclosingFunc.generator;
    this.withinAsync = enclosingFunc && enclosingFunc.async;
}

AssertionVisitor.prototype.enter = function (currentNode, parentNode) {
    this.canonicalCode = this.generateCanonicalCode(currentNode);
    this.powerAssertCalleeObject = this.guessPowerAssertCalleeObjectFor(currentNode.callee);

    if (this.sourceMapConsumer) {
        var pos = this.sourceMapConsumer.originalPositionFor({
            line: currentNode.loc.start.line,
            column: currentNode.loc.start.column
        });
        if (pos) {
            // console.log(JSON.stringify(pos, null, 2));
            if (pos.source) {
                if (this.sourceMapConsumer.sourceRoot && isUrl(this.sourceMapConsumer.sourceRoot)) {
                    this.filepath = _path.relative(this.sourceMapConsumer.sourceRoot, pos.source);
                } else if (this.options.sourceRoot && isAbsolute(this.options.sourceRoot) && isAbsolute(pos.source)) {
                    this.filepath = _path.relative(this.options.sourceRoot, pos.source);
                } else if (this.sourceMapConsumer.sourceRoot && isAbsolute(this.sourceMapConsumer.sourceRoot) && isAbsolute(pos.source)) {
                    this.filepath = _path.relative(this.sourceMapConsumer.sourceRoot, pos.source);
                } else if (isUrl(pos.source)) {
                    this.filepath = _path.basename(pos.source);
                } else {
                    this.filepath = pos.source;
                }
            }
            if (pos.line) {
                this.lineNum = pos.line;
            }
        }
    }

    if (!this.filepath) {
        if (this.options.sourceRoot && isAbsolute(this.options.sourceRoot) && isAbsolute(this.options.path)) {
            this.filepath = _path.relative(this.options.sourceRoot, this.options.path);
        } else {
            this.filepath = this.options.path;
        }
    }

    this.filepath = fallbackOnBasename(this.filepath);

    if (!this.lineNum) {
        this.lineNum = currentNode.loc.start.line;
    }
};

AssertionVisitor.prototype.leave = function (currentNode, parentNode) {
    // nothing to do now
};

AssertionVisitor.prototype.verifyNotInstrumented = function (currentNode) {
    if (currentNode.type !== syntax.CallExpression) {
        return;
    }
    if (currentNode.callee.type !== syntax.MemberExpression) {
        return;
    }
    var prop = currentNode.callee.property;
    if (prop.type === syntax.Identifier && prop.name === '_expr') {
        if (astEqual(currentNode.callee.object, this.powerAssertCalleeObject)) {
            var errorMessage = 'Attempted to transform AST twice.';
            if (this.options.path) {
                errorMessage += ' path: ' + this.options.path;
            }
            throw new EspowerError(errorMessage, this.verifyNotInstrumented);
        }
    }
};

AssertionVisitor.prototype.enterArgument = function (currentNode, parentNode, path) {
    var argMatchResult = this.matcher.matchArgument(currentNode, parentNode);
    if (argMatchResult) {
        if (argMatchResult.name === 'message' && argMatchResult.kind === 'optional') {
            // skip optional message argument
            return undefined;
        }
        this.verifyNotInstrumented(currentNode);
        // entering target argument
        this.currentArgumentPath = [].concat(path);
        return undefined;
    }
    return undefined;
};

AssertionVisitor.prototype.leaveArgument = function (resultTree) {
    this.currentArgumentPath = null;
    if (this.argumentModified) {
        this.argumentModified = false;
        return this.captureArgument(resultTree);
    } else {
        return resultTree;
    }
};

AssertionVisitor.prototype.isCapturingArgument = function () {
    return !!this.currentArgumentPath;
};

AssertionVisitor.prototype.isLeavingAssertion = function (nodePath) {
    return isPathIdentical(this.assertionPath, nodePath);
};

AssertionVisitor.prototype.isLeavingArgument = function (nodePath) {
    return isPathIdentical(this.currentArgumentPath, nodePath);
};

AssertionVisitor.prototype.captureArgument = function (node) {
    var n = newNodeWithLocationCopyOf(node);
    var props = [];
    var newCalleeObject = updateLocRecursively(espurify(this.powerAssertCalleeObject), n, this.options.visitorKeys);
    if (this.withinAsync) {
        addLiteralTo(props, n, 'async', true);
    }
    addLiteralTo(props, n, 'content', this.canonicalCode);
    addLiteralTo(props, n, 'filepath', this.filepath);
    if (this.withinGenerator) {
        addLiteralTo(props, n, 'generator', true);
    }
    addLiteralTo(props, n, 'line', this.lineNum);
    return n({
        type: syntax.CallExpression,
        callee: n({
            type: syntax.MemberExpression,
            computed: false,
            object: newCalleeObject,
            property: n({
                type: syntax.Identifier,
                name: '_expr'
            })
        }),
        arguments: [node].concat(n({
            type: syntax.ObjectExpression,
            properties: props
        }))
    });
};

AssertionVisitor.prototype.captureNode = function (target, path) {
    this.argumentModified = true;
    var n = newNodeWithLocationCopyOf(target);
    var relativeEsPath = path.slice(this.assertionPath.length);
    var newCalleeObject = updateLocRecursively(espurify(this.powerAssertCalleeObject), n, this.options.visitorKeys);
    return n({
        type: syntax.CallExpression,
        callee: n({
            type: syntax.MemberExpression,
            computed: false,
            object: newCalleeObject,
            property: n({
                type: syntax.Identifier,
                name: '_capt'
            })
        }),
        arguments: [
            target,
            n({
                type: syntax.Literal,
                value: relativeEsPath.join('/')
            })
        ]
    });
};

AssertionVisitor.prototype.toBeSkipped = function (currentNode, parentNode, currentKey) {
    return toBeSkipped(currentNode, parentNode, currentKey);
};

AssertionVisitor.prototype.toBeCaptured = function (currentNode, parentNode, currentKey) {
    return toBeCaptured(currentNode, parentNode, currentKey);
};

AssertionVisitor.prototype.generateCanonicalCode = function (node) {
    var visitorKeys = this.options.visitorKeys;
    var ast = espurifyWithRaw(node);
    var visitor = {
        leave: function (currentNode, parentNode) {
            if (currentNode.type === syntax.Literal && typeof currentNode.raw !== 'undefined') {
                currentNode['x-verbatim-espower'] = {
                    content : currentNode.raw,
                    precedence : escodegen.Precedence.Primary
                };
                return currentNode;
            } else {
                return undefined;
            }
        }
    };
    if (visitorKeys) {
        visitor.keys = visitorKeys;
    }
    estraverse.replace(ast, visitor);
    return escodegen.generate(ast, canonicalCodeOptions);
};

AssertionVisitor.prototype.guessPowerAssertCalleeObjectFor = function (node) {
    switch(node.type) {
    case syntax.Identifier:
        return node;
    case syntax.MemberExpression:
        return node.object; // Returns browser.assert when browser.assert.element(selector)
    }
    return null;
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

function addLiteralTo (props, createNode, name, data) {
    if (data) {
        addToProps(props, createNode, name, createNode({
            type: syntax.Literal,
            value: data
        }));
    }
}

function addToProps (props, createNode, name, value) {
    props.push(createNode({
        type: syntax.Property,
        key: createNode({
            type: syntax.Identifier,
            name: name
        }),
        value: value,
        method: false,
        shorthand: false,
        computed: false,
        kind: 'init'
    }));
}

function updateLocRecursively (node, n, visitorKeys) {
    var visitor = {
        leave: function (currentNode, parentNode) {
            return n(currentNode);
        }
    };
    if (visitorKeys) {
        visitor.keys = visitorKeys;
    }
    estraverse.replace(node, visitor);
    return node;
}

function isPathIdentical (path1, path2) {
    if (!path1 || !path2) {
        return false;
    }
    return path1.join('/') === path2.join('/');
}

function newNodeWithLocationCopyOf (original) {
    return function (newNode) {
        if (typeof original.loc !== 'undefined') {
            var newLoc = {
                start: {
                    line: original.loc.start.line,
                    column: original.loc.start.column
                },
                end: {
                    line: original.loc.end.line,
                    column: original.loc.end.column
                }
            };
            if (typeof original.loc.source !== 'undefined') {
                newLoc.source = original.loc.source;
            }
            newNode.loc = newLoc;
        }
        if (isArray(original.range)) {
            newNode.range = [original.range[0], original.range[1]];
        }
        return newNode;
    };
}

module.exports = AssertionVisitor;
