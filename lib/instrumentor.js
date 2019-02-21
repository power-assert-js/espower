'use strict';

const estraverse = require('estraverse');
const Syntax = estraverse.Syntax;
const escope = require('escope');
const createPatternMatchers = require('../lib/create-pattern-matchers');
const AssertionVisitor = require('./assertion-visitor');
const Transformation = require('./transformation');
const isSpreadElement = (node) => node.type === 'SpreadElement';
const withoutMatcherAndIndex = (p) => {
  const res = Object.assign({}, p);
  delete res.matcher;
  delete res.index;
  return res;
};

class Instrumentor {
  constructor (options) {
    verifyOptionPrerequisites(options);
    this.patternMatchers = createPatternMatchers(options);
    this.options = Object.assign({}, options, {
      patterns: this.patternMatchers.map(withoutMatcherAndIndex)
    });
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
          const patternMatcher = that.patternMatchers.find((pm) => pm.matcher.test(currentNode));
          if (patternMatcher) {
            // skip modifying argument if SpreadElement appears immediately beneath assert
            if (currentNode.arguments.some(isSpreadElement)) {
              skipping = true;
              return controller.skip();
            }
            // entering target assertion
            assertionVisitor = new AssertionVisitor(patternMatcher, Object.assign({
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
          const path = controller.path();
          const espath = path ? path.join('/') : '';
          if (transformation.isTarget(espath)) {
            const targetNode = currentNode;
            transformation.apply(espath, targetNode);
            return targetNode;
          }
          if (!assertionVisitor) {
            return undefined;
          }
          if (skipping) {
            skipping = false;
            return undefined;
          }
          if (assertionVisitor.isLeavingAssertion(controller)) {
            const resultTree = assertionVisitor.leave(controller);
            assertionVisitor = null;
            return resultTree;
          }
          if (!assertionVisitor.isCapturingArgument()) {
            return undefined;
          }
          if (assertionVisitor.isLeavingArgument(controller)) {
            // capturing whole argument on leaving argument
            return assertionVisitor.leaveArgument(controller);
          } else if (assertionVisitor.toBeCaptured(controller)) {
            // capturing intermediate Node
            return assertionVisitor.captureNode(controller);
          }
          return undefined;
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
    let errorMessage = '[espower] ECMAScript AST should contain location information.';
    if (options.path) {
      errorMessage += ' path: ' + options.path;
    }
    throw new Error(errorMessage);
  }
};

const verifyOptionPrerequisites = (options) => {
  if (options.destructive === false) {
    throw new Error('[espower] options.destructive is deprecated and always treated as destructive:true');
  }
  if (!Array.isArray(options.patterns)) {
    throw new Error('[espower] options.patterns should be an array.');
  }
};

module.exports = Instrumentor;
