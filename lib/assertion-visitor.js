'use strict';

const { ArgumentModification, NoModification } = require('./argument-modification');
const estraverse = require('estraverse');
const escodegen = require('escodegen');
const espurify = require('espurify');
const espurifyWithRaw = espurify.customize({ extra: 'raw' });
const syntax = estraverse.Syntax;
const EspowerLocationDetector = require('espower-location-detector');
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

class AssertionVisitor {
  constructor (matcher, options) {
    this.matcher = matcher;
    this.options = options;
    this.locationDetector = new EspowerLocationDetector(this.options);
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

  leave (controller) {
    // nothing to do now
  }

  enterArgument (controller) {
    const currentNode = controller.current();
    const parentNode = getParentNode(controller);
    const argMatchResult = this.matcher.matchArgument(currentNode, parentNode);
    if (argMatchResult) {
      if (argMatchResult.name === 'message' && argMatchResult.kind === 'optional') {
        // skip optional message argument
        this.currentModification = new NoModification();
      } else {
        this.verifyNotInstrumented(currentNode);
        this.currentModification = new ArgumentModification({
          options: this.options,
          assertionPath: this.assertionPath,
          canonicalCode: this.canonicalCode,
          location: this.location,
          withinGenerator: this.withinGenerator,
          withinAsync: this.withinAsync
        });
      }
    } else {
      this.currentModification = new NoModification();
    }
    this.currentModification.enter(controller);
    return undefined;
  }

  leaveArgument (resultTree) {
    const retNode = this.currentModification.leave(resultTree);
    this.currentModification = null;
    return retNode;
  }

  captureNode (controller) {
    return this.currentModification.captureNode(controller);
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
    return this.currentModification && this.currentModification.isCapturing();
  }

  isLeavingAssertion (controller) {
    return isPathIdentical(this.assertionPath, controller.path());
  }

  isLeavingArgument (controller) {
    return this.currentModification.isLeaving(controller);
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

  verifyNotInstrumented (currentNode) {
    if (currentNode.type !== syntax.CallExpression) {
      return;
    }
    if (currentNode.callee.type !== syntax.MemberExpression) {
      return;
    }
    const prop = currentNode.callee.property;
    if (prop.type === syntax.Identifier && prop.name === '_expr') {
      let errorMessage = '[espower] Attempted to transform AST twice.';
      if (this.options.path) {
        errorMessage += ' path: ' + this.options.path;
      }
      throw new Error(errorMessage);
    }
  }
}

const isPathIdentical = (path1, path2) => {
  if (!path1 || !path2) {
    return false;
  }
  return path1.join('/') === path2.join('/');
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
