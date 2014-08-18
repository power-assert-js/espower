'use strict';

var estraverse = require('estraverse'),
    escallmatch = require('escallmatch'),
    SourceMapConsumer = require('source-map').SourceMapConsumer,
    deepCopy = require('./ast-deepcopy'),
    AssertionVisitor = require('./assertion-visitor'),
    typeName = require('type-name'),
    syntax = estraverse.Syntax,
    supportedNodeTypes = [
        syntax.Identifier,
        syntax.MemberExpression,
        syntax.CallExpression,
        syntax.UnaryExpression,
        syntax.BinaryExpression,
        syntax.LogicalExpression,
        syntax.AssignmentExpression,
        syntax.ObjectExpression,
        syntax.NewExpression,
        syntax.ArrayExpression,
        syntax.ConditionalExpression,
        syntax.UpdateExpression,
        syntax.Property
    ];

function Instrumentor (options) {
    ensureOptionPrerequisites(options);
    this.options = options;
    this.matchers = options.patterns.map(escallmatch);
}

Instrumentor.prototype.instrument = function (ast) {
    if (this.options.sourceMap) {
        this.sourceMapConsumer = new SourceMapConsumer(this.options.sourceMap);
    }

    ensureAstPrerequisites(ast, this.options);
    var that = this,
        assertionVisitor,
        skipping = false,
        result = (this.options.destructive) ? ast : deepCopy(ast);

    estraverse.replace(result, {
        enter: function (currentNode, parentNode) {
            var controller = this,
                path = controller.path(),
                currentPath = path ? path[path.length - 1] : null;
            //console.log('enter currentNode:' + currentNode.type + ' parentNode: ' + parentNode.type + ' path: ' + path);
            if (assertionVisitor) {
                if (assertionVisitor.isCapturingArgument()) {
                    if (toBeSkipped(currentNode, parentNode, currentPath)) {
                        skipping = true;
                        return estraverse.VisitorOption.Skip;
                    }
                } else {
                    return assertionVisitor.enterArgument(currentNode, parentNode, [].concat(path));
                }
            } else {
                var candidates = that.matchers.filter(function (matcher) { return matcher.test(currentNode); });
                if (candidates.length === 1) {
                    // entering target assertion
                    var visitor = new AssertionVisitor(candidates[0], [].concat(path), that.sourceMapConsumer, that.options);
                    visitor.enter(currentNode, parentNode);
                    assertionVisitor = visitor;
                    return undefined;
                }
            }
            return undefined;
        },

        leave: function (currentNode, parentNode) {
            var controller = this,
                path = controller.path(),
                resultTree = currentNode;
            //console.log('leave ' + currentNode.type + ' path: ' + path);

            if (!assertionVisitor) {
                return undefined;
            }

            if (skipping) {
                skipping = false;
                return undefined;
            }

            if (assertionVisitor.isLeavingAssertion(path)) {
                assertionVisitor = null;
                return undefined;
            }

            if (!assertionVisitor.isCapturingArgument()) {
                return undefined;
            }

            if (isCalleeOfParent(currentNode, parentNode)) {
                return undefined;
            }

            //console.log('leave ' + currentNode.type + ' path: ' + path + ' ' + currentNode.name);
            switch(currentNode.type) {
            case syntax.Identifier:
            case syntax.MemberExpression:
            case syntax.CallExpression:
            case syntax.UnaryExpression:
            case syntax.BinaryExpression:
            case syntax.LogicalExpression:
            case syntax.AssignmentExpression:
            case syntax.UpdateExpression:
            case syntax.NewExpression:
                resultTree = assertionVisitor.captureNode(currentNode, path);
                break;
            default:
                break;
            }

            if (assertionVisitor.isLeavingArgument(path)) {
                return assertionVisitor.leaveArgument(resultTree, path);
            }

            return resultTree;
        }
    });
    return result;
};

function isCalleeOfParent(currentNode, parentNode) {
    return (parentNode.type === syntax.CallExpression || parentNode.type === syntax.NewExpression) &&
        parentNode.callee === currentNode;
}

function toBeSkipped (currentNode, parentNode, currentPath) {
    return !isSupportedNodeType(currentNode) ||
        isLeftHandSideOfAssignment(parentNode, currentPath) ||
        isObjectLiteralKey(parentNode, currentPath) ||
        isUpdateExpression(parentNode) ||
        isCallExpressionWithNonComputedMemberExpression(currentNode, parentNode, currentPath) ||
        isTypeOfOrDeleteUnaryExpression(currentNode, parentNode, currentPath);
}

function isLeftHandSideOfAssignment(parentNode, currentPath) {
    // Do not instrument left due to 'Invalid left-hand side in assignment'
    return parentNode.type === syntax.AssignmentExpression && currentPath === 'left';
}

function isObjectLiteralKey(parentNode, currentPath) {
    // Do not instrument Object literal key
    return parentNode.type === syntax.Property && parentNode.kind === 'init' && currentPath === 'key';
}

function isUpdateExpression(parentNode) {
    // Just wrap UpdateExpression, not digging in.
    return parentNode.type === syntax.UpdateExpression;
}

function isCallExpressionWithNonComputedMemberExpression(currentNode, parentNode, currentPath) {
    // Do not instrument non-computed property of MemberExpression within CallExpression.
    return currentNode.type === syntax.Identifier && parentNode.type === syntax.MemberExpression && !parentNode.computed && currentPath === 'property';
}

function isTypeOfOrDeleteUnaryExpression(currentNode, parentNode, currentPath) {
    // 'typeof Identifier' or 'delete Identifier' is not instrumented
    return currentNode.type === syntax.Identifier && parentNode.type === syntax.UnaryExpression && (parentNode.operator === 'typeof' || parentNode.operator === 'delete') && currentPath === 'argument';
}

function isSupportedNodeType (node) {
    return supportedNodeTypes.indexOf(node.type) !== -1;
}

function ensureAstPrerequisites (ast, options) {
    var errorMessage;
    if (typeof ast.loc === 'undefined') {
        errorMessage = 'JavaScript AST should contain location information.';
        if (options.path) {
            errorMessage += ' path: ' + options.path;
        }
        throw new Error(errorMessage);
    }
}

function ensureOptionPrerequisites (options) {
    if (typeName(options.destructive) !== 'boolean') {
        throw new Error('options.destructive should be a boolean value.');
    }
    if (typeName(options.patterns) !== 'Array') {
        throw new Error('options.patterns should be an array.');
    }
}

module.exports = Instrumentor;
