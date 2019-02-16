'use strict';

const estraverse = require('estraverse');
const syntax = estraverse.Syntax;

class NodeCreator {
  constructor ({ loc, range }) {
    this.createNode = newNodeWithLocation({ loc, range });
  }
  identifier (name) {
    return this.createNode({
      type: syntax.Identifier,
      name
    });
  }
  literal (value) {
    return this.createNode({
      type: syntax.Literal,
      value
    });
  }
  callExpression (callee, args) {
    return this.createNode({
      type: syntax.CallExpression,
      callee,
      arguments: args
    });
  }
  newExpression (callee, args) {
    return this.createNode({
      type: syntax.NewExpression,
      callee,
      arguments: args
    });
  }
  memberExpression (object, property, computed = false) {
    return this.createNode({
      type: syntax.MemberExpression,
      object,
      property,
      computed
    });
  }
  objectExpression (properties) {
    return this.createNode({
      type: syntax.ObjectExpression,
      properties
    });
  }
  property (key, value, computed = false, shorthand = false) {
    return this.createNode({
      type: syntax.Property,
      key,
      value,
      method: false,
      shorthand,
      computed,
      kind: 'init'
    });
  }
  variableDeclaration (kind, declarations) {
    return this.createNode({
      type: syntax.VariableDeclaration,
      declarations,
      kind
    });
  }
  variableDeclarator (id, init) {
    return this.createNode({
      type: syntax.VariableDeclarator,
      id,
      init
    });
  }
}

const updateLocRecursively = (node, { loc, range, visitorKeys }) => {
  const n = newNodeWithLocation({ loc, range });
  const visitor = {
    leave: function (currentNode, parentNode) {
      return n(currentNode);
    }
  };
  if (visitorKeys) {
    visitor.keys = visitorKeys;
  }
  estraverse.replace(node, visitor);
  return node;
};

const newNodeWithLocation = ({ loc, range }) => {
  return (newNode) => {
    if (typeof loc !== 'undefined') {
      const newLoc = {
        start: {
          line: loc.start.line,
          column: loc.start.column
        },
        end: {
          line: loc.end.line,
          column: loc.end.column
        }
      };
      if (typeof loc.source !== 'undefined') {
        newLoc.source = loc.source;
      }
      newNode.loc = newLoc;
    }
    if (Array.isArray(range)) {
      newNode.range = [range[0], range[1]];
    }
    return newNode;
  };
};

module.exports = {
  updateLocRecursively,
  NodeCreator
};
