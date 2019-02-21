'use strict';

const { Syntax } = require('estraverse');
const caputuringTargetTypes = [
    // Syntax.Property,
    Syntax.ObjectExpression,
    Syntax.ArrayExpression,
    // Syntax.ConditionalExpression,
    Syntax.Identifier,
    Syntax.MemberExpression,
    Syntax.CallExpression,
    Syntax.UnaryExpression,
    Syntax.BinaryExpression,
    Syntax.LogicalExpression,
    Syntax.AssignmentExpression,
    Syntax.NewExpression,
    Syntax.UpdateExpression,
    Syntax.YieldExpression,
    Syntax.AwaitExpression,
    Syntax.TemplateLiteral,
    Syntax.TaggedTemplateExpression
];

const isCaputuringTargetType = (currentNode) => {
    return caputuringTargetTypes.indexOf(currentNode.type) !== -1;
};

const isCalleeOfParent = (parentNode, currentKey) => {
    return (parentNode.type === Syntax.CallExpression || parentNode.type === Syntax.NewExpression) && currentKey === 'callee';
};

const isChildOfTaggedTemplateExpression = (parentNode) => {
    return parentNode.type === Syntax.TaggedTemplateExpression;
};

const isYieldOrAwaitArgument = (parentNode, currentKey) => {
    // capture the yielded/await result, not the promise
    return (parentNode.type === Syntax.YieldExpression || parentNode.type === Syntax.AwaitExpression) && currentKey === 'argument';
};

const getParentNode = (controller) => {
    const parents = controller.parents();
    return parents[parents.length - 1];
};

const getCurrentKey = (controller) => {
    const path = controller.path();
    return path ? path[path.length - 1] : null;
};

const toBeCaptured = (controller) => {
    const currentNode = controller.current();
    const parentNode = getParentNode(controller);
    const currentKey = getCurrentKey(controller);
    return isCaputuringTargetType(currentNode) &&
        !isYieldOrAwaitArgument(parentNode, currentKey) &&
        !isCalleeOfParent(parentNode, currentKey) &&
        !isChildOfTaggedTemplateExpression(parentNode);
};

module.exports = toBeCaptured;
