'use strict';

var estraverse = require('estraverse'),
    syntax = estraverse.Syntax,
    escallmatch = require('escallmatch'),
    cloneAst = require('./clone-ast'),
    AssertionVisitor = require('./assertion-visitor'),
    EspowerError = require('./espower-error'),
    typeName = require('type-name');

function Instrumentor (options) {
    verifyOptionPrerequisites(options);
    this.options = options;
    this.matchers = options.patterns.map(escallmatch);
}

Instrumentor.prototype.instrument = function (ast) {
    verifyAstPrerequisites(ast, this.options);
    var that = this,
        assertionVisitor,
        skipping = false,
        result = (this.options.destructive) ? ast : cloneAst(ast);

    estraverse.replace(result, {
        enter: function (currentNode, parentNode) {
            var controller = this,
                path = controller.path(),
                currentKey = path ? path[path.length - 1] : null;
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
                    assertionVisitor = new AssertionVisitor(candidates[0], path, that.options);
                    assertionVisitor.enter(currentNode, parentNode);
                    return undefined;
                }
            }
            return undefined;
        },
        leave: function (currentNode, parentNode) {
            var path = this.path(),
                resultTree = currentNode,
                currentKey = path ? path[path.length - 1] : null;
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
    });
    return result;
};

function isCalleeOfParentCallExpression (parentNode, currentKey) {
    return parentNode.type === syntax.CallExpression && currentKey === 'callee';
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
