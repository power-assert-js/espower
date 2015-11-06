'use strict';

var estraverse = require('estraverse');
var syntax = estraverse.Syntax;
var escallmatch = require('escallmatch');
var cloneAst = require('./clone-ast');
var AssertionVisitor = require('./assertion-visitor');
var EspowerError = require('./espower-error');
var typeName = require('type-name');

function Instrumentor (options) {
    verifyOptionPrerequisites(options);
    this.options = options;
    this.matchers = options.patterns.map(function (pattern) { return escallmatch(pattern, options); });
}

Instrumentor.prototype.instrument = function (ast) {
    verifyAstPrerequisites(ast, this.options);
    var that = this;
    var assertionVisitor;
    var skipping = false;
    var result = (this.options.destructive) ? ast : cloneAst(ast);
    var visitor = {
        enter: function (currentNode, parentNode) {
            var controller = this;
            var path = controller.path();
            var currentKey = path ? path[path.length - 1] : null;
            if (assertionVisitor) {
                if (assertionVisitor.toBeSkipped(currentNode, parentNode, currentKey)) {
                    skipping = true;
                    return controller.skip();
                }
                if (!assertionVisitor.isCapturingArgument() && !isCalleeOfParentCallExpression(parentNode, currentKey)) {
                    return assertionVisitor.enterArgument(currentNode, parentNode, path);
                }
            } else if (currentNode.type === syntax.CallExpression) {
                var candidates = that.matchers.filter(function (matcher) { return matcher.test(currentNode); });
                if (candidates.length === 1) {
                    // entering target assertion
                    var enclosingFunc = findEnclosingFunction(controller.parents());
                    assertionVisitor = new AssertionVisitor(candidates[0], path, enclosingFunc, that.options);
                    assertionVisitor.enter(currentNode, parentNode);
                    return undefined;
                }
            }
            return undefined;
        },
        leave: function (currentNode, parentNode) {
            var path = this.path();
            var resultTree = currentNode;
            var currentKey = path ? path[path.length - 1] : null;
            if (!assertionVisitor) {
                return undefined;
            }
            if (skipping) {
                skipping = false;
                return undefined;
            }
            if (assertionVisitor.isLeavingAssertion(path)) {
                assertionVisitor.leave(currentNode, parentNode);
                assertionVisitor = null;
                return undefined;
            }
            if (!assertionVisitor.isCapturingArgument()) {
                return undefined;
            }
            if (assertionVisitor.toBeCaptured(currentNode, parentNode, currentKey)) {
                resultTree = assertionVisitor.captureNode(currentNode, path);
            }
            if (assertionVisitor.isLeavingArgument(path)) {
                return assertionVisitor.leaveArgument(resultTree);
            }
            return resultTree;
        }
    };
    if (this.options.visitorKeys) {
        visitor.keys = this.options.visitorKeys;
    }
    estraverse.replace(result, visitor);
    return result;
};

function isCalleeOfParentCallExpression (parentNode, currentKey) {
    return parentNode.type === syntax.CallExpression && currentKey === 'callee';
}

function isFunction(node) {
    return [
          syntax.FunctionDeclaration,
          syntax.FunctionExpression,
          syntax.ArrowFunctionExpression
      ].indexOf(node.type) !== -1;
}

function findEnclosingFunction(parents) {
    for (var i = parents.length - 1; i >= 0; i--) {
        if (isFunction(parents[i])) {
            return parents[i];
        }
    }
    return null;
}

function verifyAstPrerequisites (ast, options) {
    var errorMessage;
    if (typeof ast.loc === 'undefined') {
        errorMessage = 'ECMAScript AST should contain location information.';
        if (options.path) {
            errorMessage += ' path: ' + options.path;
        }
        throw new EspowerError(errorMessage, verifyAstPrerequisites);
    }
}

function verifyOptionPrerequisites (options) {
    if (typeName(options.destructive) !== 'boolean') {
        throw new EspowerError('options.destructive should be a boolean value.', verifyOptionPrerequisites);
    }
    if (typeName(options.patterns) !== 'Array') {
        throw new EspowerError('options.patterns should be an array.', verifyOptionPrerequisites);
    }
}

module.exports = Instrumentor;
