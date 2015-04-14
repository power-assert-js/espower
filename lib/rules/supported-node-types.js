'use strict';

var estraverse = require('estraverse'),
    syntax = estraverse.Syntax;

module.exports = [
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
    syntax.TemplateLiteral,
    syntax.Property
];
