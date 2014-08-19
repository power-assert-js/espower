'use strict';

var estraverse = require('estraverse'),
    escodegen = require('escodegen'),
    espurify = require('espurify'),
    clone = require('clone'),
    syntax = estraverse.Syntax,
    canonicalCodeOptions = {
        format: {
            indent: {
                style: ''
            },
            newline: ''
        },
        verbatim: 'x-verbatim-espower'
    };

// see: https://github.com/Constellation/escodegen/issues/115
if (typeof define === 'function' && define.amd) {
    escodegen = window.escodegen;
}

function AssertionVisitor (matcher, path, sourceMapConsumer, options) {
    this.matcher = matcher;
    this.assertionPath = [].concat(path);
    this.sourceMapConsumer = sourceMapConsumer;
    this.options = options;
    this.currentArgumentPath = null;
    this.argumentModified = false;
}

AssertionVisitor.prototype.enter = function (currentNode, parentNode) {
    this.canonicalCode = generateCanonicalCode(currentNode);
    this.powerAssertCallee = guessPowerAssertCalleeFor(currentNode.callee);

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

AssertionVisitor.prototype.enterArgument = function (currentNode, parentNode, path) {
    var argMatchResult = this.matcher.matchArgument(currentNode, parentNode);
    if (argMatchResult) {
        if (argMatchResult.name === 'message' && argMatchResult.kind === 'optional') {
            // skip optional message argument
            return undefined;
        }
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
        newCallee = updateLocRecursively(espurify(this.powerAssertCallee), n);
    addLiteralTo(props, n, 'content', this.canonicalCode);
    addLiteralTo(props, n, 'filepath', this.filepath);
    addLiteralTo(props, n, 'line', this.lineNum);
    return n({
        type: syntax.CallExpression,
        callee: n({
            type: syntax.MemberExpression,
            computed: false,
            object: newCallee,
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
        newCallee = updateLocRecursively(espurify(this.powerAssertCallee), n);
    return n({
        type: syntax.CallExpression,
        callee: n({
            type: syntax.MemberExpression,
            computed: false,
            object: newCallee,
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

function guessPowerAssertCalleeFor (node) {
    switch(node.type) {
    case syntax.Identifier:
        return node;
    case syntax.MemberExpression:
        return node.object; // Returns browser.assert when browser.assert.element(selector)
    }
    return null;
}

function generateCanonicalCode (node) {
    var ast = clone(node);
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
            newNode.loc = clone(original.loc);
        }
        if (typeof original.range !== 'undefined') {
            newNode.range = clone(original.range);
        }
        return newNode;
    };
}

module.exports = AssertionVisitor;
