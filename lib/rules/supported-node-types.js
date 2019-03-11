'use strict';

const { Syntax } = require('estraverse');

module.exports = [
  Syntax.Identifier,
  Syntax.MemberExpression,
  Syntax.CallExpression,
  Syntax.UnaryExpression,
  Syntax.BinaryExpression,
  Syntax.LogicalExpression,
  Syntax.AssignmentExpression,
  Syntax.ObjectExpression,
  Syntax.NewExpression,
  Syntax.ArrayExpression,
  Syntax.ConditionalExpression,
  Syntax.UpdateExpression,
  Syntax.SequenceExpression,
  Syntax.TemplateLiteral,
  Syntax.TaggedTemplateExpression,
  Syntax.SpreadElement,
  Syntax.YieldExpression,
  Syntax.AwaitExpression,
  Syntax.Property
];
