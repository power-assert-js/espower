'use strict';

const estraverse = require('estraverse');
const Syntax = estraverse.Syntax;
const escope = require('escope');
const escallmatch = require('escallmatch');
const AssertionVisitor = require('./assertion-visitor');
const Transformation = require('./transformation');
const EspowerError = require('./espower-error');
const isSpreadElement = (node) => node.type === 'SpreadElement';

class Instrumentor {
  constructor (options) {
    verifyOptionPrerequisites(options);
    this.options = options;
    this.matchers = options.patterns.map((pattern) => escallmatch(pattern, options));
  }

  instrument (ast) {
    return estraverse.replace(ast, this.createVisitor(ast));
  }

  createVisitor (ast) {
    verifyAstPrerequisites(ast, this.options);
    const that = this;
    let assertionVisitor;
    const storage = {};
    let skipping = false;
    const escopeOptions = {
      ecmaVersion: this.options.ecmaVersion,
      sourceType: this.options.sourceType
    };
    if (this.options.visitorKeys) {
      escopeOptions.childVisitorKeys = this.options.visitorKeys;
    }
    const scopeManager = escope.analyze(ast, escopeOptions);
    const globalScope = scopeManager.acquire(ast);
    const scopeStack = [];
    scopeStack.push(globalScope);
    const transformation = new Transformation();
    const visitor = {
      enter: function (currentNode, parentNode) {
        if (/Function/.test(currentNode.type)) {
          scopeStack.push(scopeManager.acquire(currentNode));
        }
        const controller = this;
        const path = controller.path();
        const currentKey = path ? path[path.length - 1] : null;
        if (assertionVisitor) {
          if (assertionVisitor.toBeSkipped(controller)) {
            skipping = true;
            return controller.skip();
          }
          if (!assertionVisitor.isCapturingArgument() && !isCalleeOfParentCallExpression(parentNode, currentKey)) {
            return assertionVisitor.enterArgument(controller);
          }
        } else if (currentNode.type === Syntax.CallExpression) {
          const matcher = that.matchers.find((matcher) => matcher.test(currentNode));
          if (matcher) {
            // skip modifying argument if SpreadElement appears immediately beneath assert
            if (currentNode.arguments.some(isSpreadElement)) {
              skipping = true;
              return controller.skip();
            }
            // entering target assertion
            assertionVisitor = new AssertionVisitor(matcher, Object.assign({
              storage: storage,
              transformation: transformation,
              globalScope: globalScope,
              scopeStack: scopeStack
            }, that.options));
            assertionVisitor.enter(controller);
            return undefined;
          }
        }
        return undefined;
      },
      leave: function (currentNode, parentNode) {
        try {
          const controller = this;
          let resultTree = currentNode;
          const path = controller.path();
          const espath = path ? path.join('/') : '';
          if (transformation.isTarget(espath)) {
            transformation.apply(espath, resultTree);
            return resultTree;
          }
          if (!assertionVisitor) {
            return undefined;
          }
          if (skipping) {
            skipping = false;
            return undefined;
          }
          if (assertionVisitor.isLeavingAssertion(controller)) {
            assertionVisitor.leave(controller);
            assertionVisitor = null;
            return undefined;
          }
          if (!assertionVisitor.isCapturingArgument()) {
            return undefined;
          }
          if (assertionVisitor.toBeCaptured(controller)) {
            resultTree = assertionVisitor.captureNode(controller);
          }
          if (assertionVisitor.isLeavingArgument(controller)) {
            return assertionVisitor.leaveArgument(resultTree);
          }
          return resultTree;
        } finally {
          if (/Function/.test(currentNode.type)) {
            scopeStack.pop();
          }
        }
      }
    };
    if (this.options.visitorKeys) {
      visitor.keys = this.options.visitorKeys;
    }
    return visitor;
  }
}

const isCalleeOfParentCallExpression = (parentNode, currentKey) => {
  return parentNode.type === Syntax.CallExpression && currentKey === 'callee';
};

const verifyAstPrerequisites = (ast, options) => {
  if (typeof ast.loc === 'undefined') {
    let errorMessage = 'ECMAScript AST should contain location information.';
    if (options.path) {
      errorMessage += ' path: ' + options.path;
    }
    throw new EspowerError(errorMessage, verifyAstPrerequisites);
  }
};

const verifyOptionPrerequisites = (options) => {
  if (options.destructive === false) {
    throw new EspowerError('options.destructive is deprecated and always treated as destructive:true', verifyOptionPrerequisites);
  }
  if (!Array.isArray(options.patterns)) {
    throw new EspowerError('options.patterns should be an array.', verifyOptionPrerequisites);
  }
};

module.exports = Instrumentor;
