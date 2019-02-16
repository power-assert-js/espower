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
    this.valueRecorder = this.createNewRecorder(controller);
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

  createNewRecorder (controller) {
    const currentBlock = findBlockedScope(this.options.scopeStack).block;
    const scopeBlockEspath = findEspathOfAncestorNode(currentBlock, controller);
    const recorderConstructorName = this.getRecorderConstructorName(controller);
    const recorderVariableName = this.options.transformation.generateUniqueName('rec');
    const currentNode = controller.current();
    const types = new NodeCreator(currentNode);
    const ident = types.identifier(recorderVariableName);
    const init = types.newExpression(types.identifier(recorderConstructorName), []);
    const decl = types.variableDeclaration('var', [
      types.variableDeclarator(ident, init)
    ]);
    this.options.transformation.register(scopeBlockEspath, (matchNode) => {
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
  }

  getRecorderConstructorName (controller) {
    let ctorName = this.options.storage.powerAssertRecorderConstructorName;
    if (!ctorName) {
      ctorName = this.createRecorderClass(controller);
    }
    return ctorName;
  }

  createRecorderClass (controller) {
    const globalScope = this.options.globalScope;
    const globalScopeBlockEspath = findEspathOfAncestorNode(globalScope.block, controller);
    const createNode = newNodeWithLocationCopyOf(globalScope.block);
    const ctorName = this.options.transformation.generateUniqueName('PowerAssertRecorder');
    const types = new NodeCreator(globalScope.block);
    const classDef = updateLocRecursively(espurify(recorderClassAst), createNode, this.options.visitorKeys);
    const decl = types.variableDeclaration('var', [
      types.variableDeclarator(types.identifier(ctorName), classDef)
    ]);
    this.options.transformation.register(globalScopeBlockEspath, (matchNode) => {
      insertAfterUseStrictDirective(decl, matchNode.body);
    });
    this.options.storage.powerAssertRecorderConstructorName = ctorName;
    return ctorName;
  }
}

class NodeCreator {
  constructor (locationNode) {
    this.createNode = newNodeWithLocationCopyOf(locationNode);
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

const updateLocRecursively = (node, n, visitorKeys) => {
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

const newNodeWithLocationCopyOf = (original) => {
  return (newNode) => {
    if (typeof original.loc !== 'undefined') {
      const newLoc = {
        start: {
          line: original.loc.start.line,
          column: original.loc.start.column
        },
        end: {
          line: original.loc.end.line,
          column: original.loc.end.column
        }
      };
      if (typeof original.loc.source !== 'undefined') {
        newLoc.source = original.loc.source;
      }
      newNode.loc = newLoc;
    }
    if (Array.isArray(original.range)) {
      newNode.range = [original.range[0], original.range[1]];
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
