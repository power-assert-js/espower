'use strict';

const estraverse = require('estraverse');
const syntax = estraverse.Syntax;
const espurify = require('espurify');
const recorderClassAst = require('./power-assert-recorder.json');
const { updateLocRecursively, NodeCreator } = require('./create-node-with-loc');

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

const getOrCreateNode = ({ keyName, generateNode, controller, transformation, storage, globalScope, visitorKeys, updateLoc = true }) => {
  return storage[keyName] || createNode({ keyName, generateNode, controller, transformation, storage, globalScope, visitorKeys, updateLoc });
};

const createNode = ({ keyName, generateNode, controller, transformation, storage, globalScope, visitorKeys, updateLoc }) => {
  const globalScopeBlockEspath = findEspathOfAncestorNode(globalScope.block, controller);
  const idName = transformation.generateUniqueName(keyName);
  const generatedNode = generateNode();
  let init = generatedNode;
  if (updateLoc) {
    init = updateLocRecursively(generatedNode, {
      loc: globalScope.block.loc,
      range: globalScope.block.range,
      visitorKeys
    });
  }
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
  createNewRecorder,
  getOrCreateNode,
  NodeCreator
};
