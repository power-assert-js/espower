'use strict';

const estraverse = require('estraverse');
const escodegen = require('escodegen');
const espurify = require('espurify');
const espurifyWithRaw = espurify.customize({ extra: 'raw' });
const syntax = estraverse.Syntax;
const EspowerLocationDetector = require('espower-location-detector');
const EspowerError = require('./espower-error');
const toBeSkipped = require('./rules/to-be-skipped');
const toBeCaptured = require('./rules/to-be-captured');
const canonicalCodeOptions = {
  format: {
    indent: {
      style: ''
    },
    newline: ''
  },
  verbatim: 'x-verbatim-espower'
};
const recorderClassAst = require('./power-assert-recorder.json');

class AssertionVisitor {
  constructor (matcher, options) {
    this.matcher = matcher;
    this.options = options;
    this.valueRecorder = null;
    this.locationDetector = new EspowerLocationDetector(this.options);
    this.currentArgumentPath = null;
    this.argumentModified = false;
  }

  enter (controller) {
    this.assertionPath = [].concat(controller.path());
    const currentNode = controller.current();
    this.canonicalCode = this.generateCanonicalCode(currentNode);
    this.location = this.locationDetector.locationFor(currentNode);
    const enclosingFunc = findEnclosingFunction(controller.parents());
    this.withinGenerator = enclosingFunc && enclosingFunc.generator;
    this.withinAsync = enclosingFunc && enclosingFunc.async;
  }

  enterArgument (controller) {
    const currentNode = controller.current();
    const parentNode = getParentNode(controller);
    const argMatchResult = this.matcher.matchArgument(currentNode, parentNode);
    if (!argMatchResult) {
      return undefined;
    }
    if (argMatchResult.name === 'message' && argMatchResult.kind === 'optional') {
      // skip optional message argument
      return undefined;
    }
    this.verifyNotInstrumented(currentNode);
    // create recorder per argument
    this.valueRecorder = this.createNewRecorder(controller);
    // entering target argument
    this.currentArgumentPath = [].concat(controller.path());
    return undefined;
  }

  leave (controller) {
    // nothing to do now
  }

  leaveArgument (resultTree) {
    try {
      return this.argumentModified ? this.captureArgument(resultTree) : resultTree;
    } finally {
      this.currentArgumentPath = null;
      this.argumentModified = false;
      this.valueRecorder = null;
    }
  }

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

  toBeSkipped (controller) {
    const currentNode = controller.current();
    const parentNode = getParentNode(controller);
    const currentKey = getCurrentKey(controller);
    return toBeSkipped(currentNode, parentNode, currentKey);
  }

  toBeCaptured (controller) {
    const currentNode = controller.current();
    const parentNode = getParentNode(controller);
    const currentKey = getCurrentKey(controller);
    return toBeCaptured(currentNode, parentNode, currentKey);
  }

  isCapturingArgument () {
    return !!this.currentArgumentPath;
  }

  isLeavingAssertion (controller) {
    return isPathIdentical(this.assertionPath, controller.path());
  }

  isLeavingArgument (controller) {
    return isPathIdentical(this.currentArgumentPath, controller.path());
  }

  // internal

  generateCanonicalCode (node) {
    const visitorKeys = this.options.visitorKeys;
    const ast = espurifyWithRaw(node);
    const visitor = {
      leave: function (currentNode, parentNode) {
        if (currentNode.type === syntax.Literal && typeof currentNode.raw !== 'undefined') {
          currentNode['x-verbatim-espower'] = {
            content: currentNode.raw,
            precedence: escodegen.Precedence.Primary
          };
          return currentNode;
        } else {
          return undefined;
        }
      }
    };
    if (visitorKeys) {
      visitor.keys = visitorKeys;
    }
    estraverse.replace(ast, visitor);
    return escodegen.generate(ast, canonicalCodeOptions);
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

  verifyNotInstrumented (currentNode) {
    if (currentNode.type !== syntax.CallExpression) {
      return;
    }
    if (currentNode.callee.type !== syntax.MemberExpression) {
      return;
    }
    const prop = currentNode.callee.property;
    if (prop.type === syntax.Identifier && prop.name === '_expr') {
      let errorMessage = 'Attempted to transform AST twice.';
      if (this.options.path) {
        errorMessage += ' path: ' + this.options.path;
      }
      throw new EspowerError(errorMessage, this.verifyNotInstrumented);
    }
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

const isFunction = (node) => {
  switch (node.type) {
    case syntax.FunctionDeclaration:
    case syntax.FunctionExpression:
    case syntax.ArrowFunctionExpression:
      return true;
  }
  return false;
};

const findEnclosingFunction = (parents) => {
  for (let i = parents.length - 1; i >= 0; i--) {
    if (isFunction(parents[i])) {
      return parents[i];
    }
  }
  return null;
};

const getParentNode = (controller) => {
  const parents = controller.parents();
  return parents[parents.length - 1];
};

const getCurrentKey = (controller) => {
  const path = controller.path();
  return path ? path[path.length - 1] : null;
};

module.exports = AssertionVisitor;
