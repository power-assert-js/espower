'use strict';

var estraverse = require('estraverse'),
    syntax = estraverse.Syntax,
    supportedNodeTypes = require('./supported-node-types');

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

module.exports = function toBeSkipped (currentNode, parentNode, currentPath) {
    return !isSupportedNodeType(currentNode) ||
        isLeftHandSideOfAssignment(parentNode, currentPath) ||
        isObjectLiteralKey(parentNode, currentPath) ||
        isUpdateExpression(parentNode) ||
        isCallExpressionWithNonComputedMemberExpression(currentNode, parentNode, currentPath) ||
        isTypeOfOrDeleteUnaryExpression(currentNode, parentNode, currentPath);
};
