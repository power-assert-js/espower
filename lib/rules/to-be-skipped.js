'use strict';

var estraverse = require('estraverse'),
    syntax = estraverse.Syntax,
    supportedNodeTypes = require('./supported-node-types');

function isLeftHandSideOfAssignment(parentNode, currentKey) {
    // Do not instrument left due to 'Invalid left-hand side in assignment'
    return parentNode.type === syntax.AssignmentExpression && currentKey === 'left';
}

function isObjectLiteralKey(parentNode, currentKey) {
    // Do not instrument Object literal key
    return parentNode.type === syntax.Property && parentNode.kind === 'init' && currentKey === 'key';
}

function isUpdateExpression(parentNode) {
    // Just wrap UpdateExpression, not digging in.
    return parentNode.type === syntax.UpdateExpression;
}

function isCallExpressionWithNonComputedMemberExpression(currentNode, parentNode, currentKey) {
    // Do not instrument non-computed property of MemberExpression within CallExpression.
    return currentNode.type === syntax.Identifier && parentNode.type === syntax.MemberExpression && !parentNode.computed && currentKey === 'property';
}

function isTypeOfOrDeleteUnaryExpression(currentNode, parentNode, currentKey) {
    // 'typeof Identifier' or 'delete Identifier' is not instrumented
    return currentNode.type === syntax.Identifier && parentNode.type === syntax.UnaryExpression && (parentNode.operator === 'typeof' || parentNode.operator === 'delete') && currentKey === 'argument';
}

function isSupportedNodeType (node) {
    return supportedNodeTypes.indexOf(node.type) !== -1;
}

module.exports = function toBeSkipped (currentNode, parentNode, currentKey) {
    return !isSupportedNodeType(currentNode) ||
        isLeftHandSideOfAssignment(parentNode, currentKey) ||
        isObjectLiteralKey(parentNode, currentKey) ||
        isUpdateExpression(parentNode) ||
        isCallExpressionWithNonComputedMemberExpression(currentNode, parentNode, currentKey) ||
        isTypeOfOrDeleteUnaryExpression(currentNode, parentNode, currentKey);
};
