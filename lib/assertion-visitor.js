'use strict';

const { ArgumentModification, NoModification } = require('./argument-modification');
const { createNewAssertionMessage, NodeCreator, getOrCreateNode, findBlockedScope, findEspathOfAncestorNode, insertAfterUseStrictDirective } = require('./create-node');
const estraverse = require('estraverse');
const escodegen = require('escodegen');
const espurify = require('espurify');
const espurifyWithRaw = espurify.customize({ extra: 'raw' });
const syntax = estraverse.Syntax;
const EspowerLocationDetector = require('espower-location-detector');
const toBeSkipped = require('./rules/to-be-skipped');
const toBeCaptured = require('./rules/to-be-captured');
const { getParentNode, getCurrentKey } = require('./controller-utils');
const recorderClassAst = require('./templates/argument-recorder.json');
const assertionMessageClassAst = require('./templates/assertion-message');
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
  constructor (patternMatcher, options) {
    this.patternMatcher = patternMatcher;
    this.matcher = patternMatcher.matcher;
    this.options = options;
    this.argumentModifiedHistory = [];
    this.messageUpdated = false;
  }

  enter (controller) {
    this.assertionPath = [].concat(controller.path());
    const currentNode = controller.current();
    this.calleeNode = currentNode.callee;
    this.canonicalCode = this.generateCanonicalCode(currentNode);
    const enclosingFunc = findEnclosingFunction(controller.parents());
    this.withinGenerator = enclosingFunc && enclosingFunc.generator;
    this.withinAsync = enclosingFunc && enclosingFunc.async;
    // should be before generateMetadata
    this.metadataGeneratorIdent = this.generateMetadataGenerator(controller);
    getOrCreateNode(Object.assign({
      keyName: 'ArgumentRecorder',
      generateNode: () => espurify(recorderClassAst),
      controller
    }, this.options));
    getOrCreateNode(Object.assign({
      keyName: 'AssertionMessage',
      generateNode: () => espurify(assertionMessageClassAst),
      controller
    }, this.options));
    // should be after configIdent creation and enclosingFunc detection
    this.metadataIdent = this.generateMetadata(controller);
  }

  leave (controller) {
    const modifiedSome = this.argumentModifiedHistory.some((b) => b);
    try {
      return modifiedSome ? this.appendMessage(controller) : controller.current();
    } finally {
      this.argumentModifiedHistory = [];
      this.messageUpdated = false;
    }
  }

  enterArgument (controller) {
    const currentNode = controller.current();
    const parentNode = getParentNode(controller);
    const argMatchResult = this.matcher.matchArgument(currentNode, parentNode);
    if (argMatchResult) {
      this.verifyNotInstrumented(currentNode);
      this.currentModification = new ArgumentModification({
        argMatchResult,
        options: this.options,
        assertionPath: this.assertionPath,
        calleeNode: this.calleeNode,
        metadataIdent: this.metadataIdent
      });
    } else {
      this.currentModification = new NoModification();
    }
    this.currentModification.enter(controller);
    return undefined;
  }

  leaveArgument (controller) {
    const retNode = this.currentModification.leave(controller);
    this.messageUpdated = this.currentModification.isMessageUpdated();
    this.argumentModifiedHistory.push(this.currentModification.isArgumentModified());
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
    return toBeSkipped({ currentNode, parentNode, currentKey });
  }

  toBeCaptured (controller) {
    return toBeCaptured(controller);
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

  appendMessage (controller) {
    const currentNode = controller.current();
    if (this.messageUpdated) {
      // AssertionMessage is already merged with existing message argument
      return currentNode;
    }
    const sigs = this.matcher.argumentSignatures();
    const numDefinedParams = sigs.length;
    const lastParam = sigs[numDefinedParams - 1];
    const hasOptionalMessageArgument = (lastParam.name === 'message' && lastParam.kind === 'optional');
    if (!hasOptionalMessageArgument) {
      return currentNode;
    }
    const numActualArgs = currentNode.arguments.length;
    const onlyLastArgumentIsOmitted = (numDefinedParams - numActualArgs === 1);

    const params = Object.assign({
      controller,
      metadataIdent: this.metadataIdent
    }, this.options);

    if (onlyLastArgumentIsOmitted) {
      // appending AssertionMessage in place of omitted message argument (as index -1)
      currentNode.arguments.push(createNewAssertionMessage(params));
    } else if (numDefinedParams === numActualArgs) {
      const lastIndex = numActualArgs - 1;
      const lastActualArg = currentNode.arguments[lastIndex];
      if (toBeSkipped({ currentNode: lastActualArg, parentNode: currentNode, currentKey: lastIndex })) {
        // last arg may be a string literal
        currentNode.arguments[lastIndex] = createNewAssertionMessage(Object.assign({}, {
          originalMessageNode: lastActualArg,
          matchIndex: lastIndex
        }, params));
      }
    }
    return currentNode;
  }

  generateMetadataGenerator (controller) {
    const options = this.options;
    const types = new NodeCreator(options.globalScope.block);
    const generateNode = () => {
      const patternIndexIdent = types.identifier('ptnidx');
      const contentIdent = types.identifier('content');
      const lineIdent = types.identifier('line');
      const extraIdent = types.identifier('extra');
      const configVersion = 2;
      const versionIdent = types.identifier('version');
      const filepathIdent = types.identifier('filepath');
      const patternsIdent = types.identifier('patterns');
      const patternsNode = types.valueToNode(options.patterns);
      const objectAssignMethod = types.memberExpression(types.identifier('Object'), types.identifier('assign'));
      return types.arrowFunctionExpression([
        patternIndexIdent,
        contentIdent,
        filepathIdent,
        lineIdent,
        extraIdent
      ], types.blockStatement([
        types.variableDeclaration('const', [
          types.variableDeclarator(versionIdent, types.numericLiteral(configVersion)),
          types.variableDeclarator(patternsIdent, patternsNode)
        ]),
        types.returnStatement(types.callExpression(objectAssignMethod, [
          types.objectExpression([
            types.objectProperty(versionIdent, versionIdent, false, true),
            types.objectProperty(contentIdent, contentIdent, false, true),
            types.objectProperty(filepathIdent, filepathIdent, false, true),
            types.objectProperty(lineIdent, lineIdent, false, true)
          ]),
          extraIdent,
          types.memberExpression(patternsIdent, patternIndexIdent, true)
        ]))
      ]));
    };
    return getOrCreateNode(Object.assign({
      keyName: 'pwmeta',
      generateNode,
      controller,
      updateLoc: false
    }, options));
  }

  generateMetadata (controller) {
    const currentNode = controller.current();
    const transformation = this.options.transformation;
    const types = new NodeCreator(currentNode);
    const props = {};
    if (this.withinAsync) {
      props.async = true;
    }
    if (this.withinGenerator) {
      props.generator = true;
    }
    const propsNode = types.valueToNode(props);
    const locationDetector = new EspowerLocationDetector(this.options);
    const { source, line } = locationDetector.locationFor(currentNode);
    const args = [
      types.numericLiteral(this.patternMatcher.index),
      types.stringLiteral(this.canonicalCode),
      source ? types.stringLiteral(source) : types.nullLiteral(),
      types.numericLiteral(line)
    ];
    if (propsNode.properties.length > 0) {
      args.push(propsNode);
    }
    const init = types.callExpression(this.metadataGeneratorIdent, args);
    const varName = transformation.generateUniqueName('am');
    const ident = types.identifier(varName);
    const decl = types.variableDeclaration('var', [
      types.variableDeclarator(ident, init)
    ]);
    const currentBlock = findBlockedScope(this.options.scopeStack).block;
    const scopeBlockEspath = findEspathOfAncestorNode(currentBlock, controller);
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
  }

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
    if (prop.type === syntax.Identifier && prop.name === '_rec') {
      let errorMessage = '[espower] Attempted to transform AST twice.';
      if (this.options.path) {
        errorMessage += ' path: ' + this.options.path;
      }
      throw new Error(errorMessage);
    }
  }
}

const isPathIdentical = (path1, path2) => {
  return path1 && path2 && path1.join('/') === path2.join('/');
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

module.exports = AssertionVisitor;
