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
    const n = newNodeWithLocationCopyOf(currentNode);
    const relativeEsPath = path.slice(this.assertionPath.length);
    return n({
      type: syntax.CallExpression,
      callee: n({
        type: syntax.MemberExpression,
        computed: false,
        object: this.valueRecorder,
        property: n({
          type: syntax.Identifier,
          name: '_capt'
        })
      }),
      arguments: [
        currentNode,
        n({
          type: syntax.Literal,
          value: relativeEsPath.join('/')
        })
      ]
    });
  }

  captureArgument (node) {
    const n = newNodeWithLocationCopyOf(node);
    const props = [];
    addLiteralTo(props, n, 'content', this.canonicalCode);
    addLiteralTo(props, n, 'filepath', this.location.source);
    addLiteralTo(props, n, 'line', this.location.line);
    if (this.withinAsync) {
      addLiteralTo(props, n, 'async', true);
    }
    if (this.withinGenerator) {
      addLiteralTo(props, n, 'generator', true);
    }
    return n({
      type: syntax.CallExpression,
      callee: n({
        type: syntax.MemberExpression,
        computed: false,
        object: this.valueRecorder,
        property: n({
          type: syntax.Identifier,
          name: '_expr'
        })
      }),
      arguments: [node].concat(n({
        type: syntax.ObjectExpression,
        properties: props
      }))
    });
  }

  createNewRecorder (controller) {
    const currentBlock = findBlockedScope(this.options.scopeStack).block;
    const scopeBlockEspath = findEspathOfAncestorNode(currentBlock, controller);
    const recorderConstructorName = this.getRecorderConstructorName(controller);
    const recorderVariableName = this.options.transformation.generateUniqueName('rec');

    const currentNode = controller.current();
    const createNode = newNodeWithLocationCopyOf(currentNode);
    const ident = createNode({
      type: syntax.Identifier,
      name: recorderVariableName
    });
    const init = this.createNewExpression(createNode, recorderConstructorName);
    const decl = this.createVariableDeclaration(createNode, ident, init);
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
    const ident = createNode({
      type: syntax.Identifier,
      name: ctorName
    });
    const classDef = updateLocRecursively(espurify(recorderClassAst), createNode, this.options.visitorKeys);
    const decl = this.createVariableDeclaration(createNode, ident, classDef);
    this.options.transformation.register(globalScopeBlockEspath, (matchNode) => {
      insertAfterUseStrictDirective(decl, matchNode.body);
    });
    this.options.storage.powerAssertRecorderConstructorName = ctorName;
    return ctorName;
  }

  createVariableDeclaration (createNode, ident, init) {
    return createNode({
      type: syntax.VariableDeclaration,
      declarations: [
        createNode({
          type: syntax.VariableDeclarator,
          id: ident,
          init: init
        })
      ],
      kind: 'var'
    });
  }

  createNewExpression (createNode, constructorName) {
    return createNode({
      type: syntax.NewExpression,
      callee: createNode({
        type: syntax.Identifier,
        name: constructorName
      }),
      arguments: []
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

const addLiteralTo = (props, createNode, name, value) => {
  if (typeof value !== 'undefined') {
    addToProps(props, createNode, name, createNode({
      type: syntax.Literal,
      value: value
    }));
  }
};

const addToProps = (props, createNode, name, value) => {
  props.push(createNode({
    type: syntax.Property,
    key: createNode({
      type: syntax.Identifier,
      name: name
    }),
    value: value,
    method: false,
    shorthand: false,
    computed: false,
    kind: 'init'
  }));
};

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
