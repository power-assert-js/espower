'use strict';

const estraverse = require('estraverse');
const syntax = estraverse.Syntax;
const espurify = require('espurify');
const recorderClassAst = require('./power-assert-recorder.json');

class ArgumentModification {
  constructor ({ options, assertionPath, canonicalCode, location, withinGenerator, withinAsync }) {
    this.options = options;
    this.assertionPath = assertionPath;
    this.canonicalCode = canonicalCode;
    this.location = location;
    this.withinGenerator = withinGenerator;
    this.withinAsync = withinAsync;
    this.argumentModified = false;
  }

  enter (controller) {
    // create recorder per argument
    this.valueRecorder = createNewRecorder(Object.assign({
      controller
    }, this.options));
    // entering target argument
    this.currentArgumentPath = [].concat(controller.path());
  }

  leave (resultTree) {
    return this.argumentModified ? this.captureArgument(resultTree) : resultTree;
  }

  isCapturing () {
    return true;
  }

  isLeaving (controller) {
    return isPathIdentical(this.currentArgumentPath, controller.path());
  }

  // internal

  captureNode (controller) {
    this.argumentModified = true;
    const currentNode = controller.current();
    const path = controller.path();
    const relativeEsPath = path.slice(this.assertionPath.length);
    const types = new NodeCreator(currentNode);
    const callee = types.memberExpression(this.valueRecorder, types.identifier('_capt'));
    return types.callExpression(callee, [
      currentNode,
      types.literal(relativeEsPath.join('/'))
    ]);
  }

  captureArgument (node) {
    const types = new NodeCreator(node);
    const props = [];
    if (this.canonicalCode) {
      props.push(types.property(types.identifier('content'), types.literal(this.canonicalCode)));
    }
    if (this.location && this.location.source) {
      props.push(types.property(types.identifier('filepath'), types.literal(this.location.source)));
    }
    if (this.location && this.location.line) {
      props.push(types.property(types.identifier('line'), types.literal(this.location.line)));
    }
    if (this.withinAsync) {
      props.push(types.property(types.identifier('async'), types.literal(true)));
    }
    if (this.withinGenerator) {
      props.push(types.property(types.identifier('generator'), types.literal(true)));
    }
    const callee = types.memberExpression(this.valueRecorder, types.identifier('_expr'));
    return types.callExpression(callee, [
      node,
      types.objectExpression(props)
    ]);
  }
}

const createNewRecorder = ({ controller, transformation, storage, scopeStack, globalScope, visitorKeys }) => {
  const currentBlock = findBlockedScope(scopeStack).block;
  const scopeBlockEspath = findEspathOfAncestorNode(currentBlock, controller);
  const recorderIdent = getOrCreateNode({
    keyName: 'PowerAssertRecorder',
    generateNode: () => espurify(recorderClassAst),
    controller,
    transformation,
    storage,
    scopeStack,
    globalScope,
    visitorKeys
  });
  const recorderVariableName = transformation.generateUniqueName('rec');
  const currentNode = controller.current();
  const types = new NodeCreator(currentNode);
  const ident = types.identifier(recorderVariableName);
  const init = types.newExpression(recorderIdent, []);
  const decl = types.variableDeclaration('var', [
    types.variableDeclarator(ident, init)
  ]);
  transformation.register(scopeBlockEspath, (matchNode) => {
    let body;
    if (/Function/.test(matchNode.type)) {
      const blockStatement = matchNode.body;
      body = blockStatement.body;
    } else {
      body = matchNode.body;
    }
    insertAfterUseStrictDirective(decl, body);
  });
  return ident;
};

const getOrCreateNode = ({ keyName, generateNode, controller, transformation, storage, globalScope, visitorKeys }) => {
  return storage[keyName] || createNode({ keyName, generateNode, controller, transformation, storage, globalScope, visitorKeys });
};

const createNode = ({ keyName, generateNode, controller, transformation, storage, globalScope, visitorKeys }) => {
  const globalScopeBlockEspath = findEspathOfAncestorNode(globalScope.block, controller);
  const idName = transformation.generateUniqueName(keyName);
  const generatedNode = generateNode();
  const init = updateLocRecursively(generatedNode, {
    loc: globalScope.block.loc,
    range: globalScope.block.range,
    visitorKeys
  });
  const types = new NodeCreator(globalScope.block);
  const ident = types.identifier(idName);
  const decl = types.variableDeclaration('var', [
    types.variableDeclarator(ident, init)
  ]);
  transformation.register(globalScopeBlockEspath, (matchNode) => {
    insertAfterUseStrictDirective(decl, matchNode.body);
  });
  storage[keyName] = ident;
  return ident;
};

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

class NoModification {
  enter (controller) {
    this.currentArgumentPath = [].concat(controller.path());
  }
  leave (resultTree) {
    return resultTree;
  }
  isCapturing () {
    return false;
  }
  isLeaving (controller) {
    return isPathIdentical(this.currentArgumentPath, controller.path());
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

const isPathIdentical = (path1, path2) => {
  if (!path1 || !path2) {
    return false;
  }
  return path1.join('/') === path2.join('/');
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

const findBlockedScope = (scopeStack) => {
  const lastIndex = scopeStack.length - 1;
  const scope = scopeStack[lastIndex];
  if (!scope.block || isArrowFunctionWithConciseBody(scope.block)) {
    return findBlockedScope(scopeStack.slice(0, lastIndex));
  }
  return scope;
};

const isArrowFunctionWithConciseBody = (node) => {
  return node.type === 'ArrowFunctionExpression' && node.body.type !== 'BlockStatement';
};

const findEspathOfAncestorNode = (targetNode, controller) => {
  // iterate child to root
  let child, parent;
  const path = controller.path();
  const parents = controller.parents();
  const popUntilParent = (key) => {
    if (parent[key] !== undefined) {
      return;
    }
    popUntilParent(path.pop());
  };
  for (let i = parents.length - 1; i >= 0; i--) {
    parent = parents[i];
    if (child) {
      popUntilParent(path.pop());
    }
    if (parent === targetNode) {
      return path.join('/');
    }
    child = parent;
  }
  return null;
};

const insertAfterUseStrictDirective = (decl, body) => {
  const firstBody = body[0];
  if (firstBody.type === syntax.ExpressionStatement) {
    const expression = firstBody.expression;
    if (expression.type === syntax.Literal && expression.value === 'use strict') {
      body.splice(1, 0, decl);
      return;
    }
  }
  body.unshift(decl);
};

module.exports = {
  ArgumentModification,
  NoModification
};
