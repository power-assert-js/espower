'use strict';

const { Syntax } = require('estraverse');
const supportedNodeTypes = require('./supported-node-types');

const isLeftHandSideOfAssignment = (parentNode, currentKey) => {
    // Do not instrument left due to 'Invalid left-hand side in assignment'
    return parentNode.type === Syntax.AssignmentExpression && currentKey === 'left';
};

const isChildOfObjectLiteral  = (parentNode) => {
    return parentNode.type === Syntax.Property && parentNode.kind === 'init';
};

const isObjectLiteralKey  = (parentNode, currentKey) => {
    return isChildOfObjectLiteral(parentNode) && currentKey === 'key';
};

const isObjectLiteralValue  = (parentNode, currentKey) => {
    return isChildOfObjectLiteral(parentNode) && currentKey === 'value';
};

const isNonComputedObjectLiteralKey = (parentNode, currentKey) => {
    // Do not instrument non-computed Object literal key
    return isObjectLiteralKey(parentNode, currentKey) && !parentNode.computed;
};

const isShorthandedValueOfObjectLiteral = (parentNode, currentKey) => {
    // Do not instrument shorthanded Object literal value
    return isObjectLiteralValue(parentNode, currentKey) && parentNode.shorthand;
};

const isUpdateExpression = (parentNode) => {
    // Just wrap UpdateExpression, not digging in.
    return parentNode.type === Syntax.UpdateExpression;
};

const isCallExpressionWithNonComputedMemberExpression = (currentNode, parentNode, currentKey) => {
    // Do not instrument non-computed property of MemberExpression within CallExpression.
    return currentNode.type === Syntax.Identifier && parentNode.type === Syntax.MemberExpression && !parentNode.computed && currentKey === 'property';
};

const isTypeOfOrDeleteUnaryExpression = (currentNode, parentNode, currentKey) => {
    // 'typeof Identifier' or 'delete Identifier' is not instrumented
    return currentNode.type === Syntax.Identifier && parentNode.type === Syntax.UnaryExpression && (parentNode.operator === 'typeof' || parentNode.operator === 'delete') && currentKey === 'argument';
};

const isSupportedNodeType  = (node) => {
    return supportedNodeTypes.indexOf(node.type) !== -1;
};

const getParentNode = (controller) => {
    const parents = controller.parents();
    return parents[parents.length - 1];
};

const getCurrentKey = (controller) => {
    const path = controller.path();
    return path ? path[path.length - 1] : null;
};

const toBeSkipped = (controller) => {
    const currentNode = controller.current();
    const parentNode = getParentNode(controller);
    const currentKey = getCurrentKey(controller);
    return !isSupportedNodeType(currentNode) ||
        isLeftHandSideOfAssignment(parentNode, currentKey) ||
        isNonComputedObjectLiteralKey(parentNode, currentKey) ||
        isShorthandedValueOfObjectLiteral(parentNode, currentKey) ||
        isUpdateExpression(parentNode) ||
        isCallExpressionWithNonComputedMemberExpression(currentNode, parentNode, currentKey) ||
        isTypeOfOrDeleteUnaryExpression(currentNode, parentNode, currentKey);
};

module.exports = toBeSkipped;
