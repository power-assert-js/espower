'use strict';

var estraverse = require('estraverse'),
    escodegen = require('escodegen'),
    espurify = require('espurify'),
    espurifyWithRaw = espurify.customize({extra: 'raw'}),
    isArray = require('isarray'),
    deepEqual = require('deep-equal'),
    syntax = estraverse.Syntax,
    SourceMapConsumer = require('source-map').SourceMapConsumer,
    EspowerError = require('./espower-error'),
    toBeSkipped = require('./rules/to-be-skipped'),
    toBeCaptured = require('./rules/to-be-captured'),
    canonicalCodeOptions = {
        format: {
            indent: {
                style: ''
            },
            newline: ''
        },
        verbatim: 'x-verbatim-espower'
    };

function astEqual (ast1, ast2) {
    return deepEqual(espurify(ast1), espurify(ast2));
}

// see: https://github.com/Constellation/escodegen/issues/115
if (typeof define === 'function' && define.amd) {
    escodegen = window.escodegen;
}

function AssertionVisitor (matcher, path, options) {
    this.matcher = matcher;
    this.assertionPath = [].concat(path);
    this.options = options || {};
    if (this.options.sourceMap) {
        this.sourceMapConsumer = new SourceMapConsumer(this.options.sourceMap);
    }
    this.currentArgumentPath = null;
    this.argumentModified = false;
}

AssertionVisitor.prototype.enter = function (currentNode, parentNode) {
    this.canonicalCode = generateCanonicalCode(currentNode);
    this.powerAssertCalleeObject = guessPowerAssertCalleeObjectFor(currentNode.callee);

    if (this.sourceMapConsumer) {
        var pos = this.sourceMapConsumer.originalPositionFor({
            line: currentNode.loc.start.line,
            column: currentNode.loc.start.column
        });
        if (pos) {
            // console.log(JSON.stringify(pos, null, 2));
            if (pos.source) {
                this.filepath = pos.source;
            }
            if (pos.line) {
                this.lineNum = pos.line;
            }
        }
    }

    if (!this.filepath) {
        this.filepath = this.options.path;
    }
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
    var n = newNodeWithLocationCopyOf(node),
        props = [],
        newCalleeObject = updateLocRecursively(espurify(this.powerAssertCalleeObject), n);
    addLiteralTo(props, n, 'content', this.canonicalCode);
    addLiteralTo(props, n, 'filepath', this.filepath);
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
    var n = newNodeWithLocationCopyOf(target),
        relativeEsPath = path.slice(this.assertionPath.length),
        newCalleeObject = updateLocRecursively(espurify(this.powerAssertCalleeObject), n);
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

function guessPowerAssertCalleeObjectFor (node) {
    switch(node.type) {
    case syntax.Identifier:
        return node;
    case syntax.MemberExpression:
        return node.object; // Returns browser.assert when browser.assert.element(selector)
    }
    return null;
}

function generateCanonicalCode (node) {
    var ast = espurifyWithRaw(node);
    estraverse.replace(ast, {
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
    });
    return escodegen.generate(ast, canonicalCodeOptions);
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

function updateLocRecursively (node, n) {
    estraverse.replace(node, {
        leave: function (currentNode, parentNode) {
            return n(currentNode);
        }
    });
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
