'use strict';

var estraverse = require('estraverse'),
    syntax = estraverse.Syntax;

module.exports = function toBeCaptured (currentNode) {
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
    case syntax.TemplateLiteral:
        return true;
    default:
        return false;
    }
};
