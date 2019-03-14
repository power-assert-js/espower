'use strict';

const { createNewRecorder, createNewAssertionMessage, NodeCreator } = require('./create-node');
const toBeCaptured = require('./rules/to-be-captured');

class ArgumentModification {
  constructor ({ options, assertionPath, calleeNode, argMatchResult, metadataIdent }) {
    this.options = options;
    this.assertionPath = assertionPath;
    this.calleeNode = calleeNode;
    this.currentArgumentMatchResult = argMatchResult;
    this.metadataIdent = metadataIdent;
    this.argumentModified = false;
  }

  enter (controller) {
    // create recorder per argument
    this.argumentRecorderIdent = createNewRecorder(Object.assign({
      controller,
      calleeNode: this.calleeNode,
      matchIndex: this.currentArgumentMatchResult.index,
      metadataIdent: this.metadataIdent
    }, this.options));
    // entering target argument
    this.currentArgumentPath = [].concat(controller.path());
  }

  leave (controller) {
    const shouldCapture = this.isArgumentModified() || toBeCaptured(controller);
    const resultNode = shouldCapture ? this.captureArgument(controller) : controller.current();
    if (this.currentArgumentMatchResult.name === 'message' && this.currentArgumentMatchResult.kind === 'optional') {
      // enclose it in AssertionMessage
      return createNewAssertionMessage(Object.assign({
        controller,
        metadataIdent: this.metadataIdent,
        matchIndex: this.currentArgumentMatchResult.index,
        originalMessageNode: resultNode
      }, this.options));
    } else {
      return resultNode;
    }
  }

  isCapturing () {
    return true;
  }

  isArgumentModified () {
    return !!this.argumentModified;
  }

  isLeaving (controller) {
    return isPathIdentical(this.currentArgumentPath, controller.path());
  }

  captureNode (controller) {
    return this.insertRecorder(controller, '_tap');
  }

  captureArgument (controller) {
    return this.insertRecorder(controller, '_rec');
  }

  // internal

  insertRecorder (controller, methodName) {
    const currentNode = controller.current();
    const receiver = this.argumentRecorderIdent;
    const path = controller.path();
    const relativeEsPath = path.slice(this.assertionPath.length);
    const types = new NodeCreator(currentNode);
    const newNode = types.callExpression(
      types.memberExpression(receiver, types.identifier(methodName)),
      [
        currentNode,
        types.stringLiteral(relativeEsPath.join('/'))
      ]
    );
    this.argumentModified = true;
    return newNode;
  }
}

class NoModification {
  enter (controller) {
    this.currentArgumentPath = [].concat(controller.path());
  }
  isCapturing () {
    return false;
  }
}

const isPathIdentical = (path1, path2) => {
  return path1 && path2 && path1.join('/') === path2.join('/');
};

module.exports = {
  ArgumentModification,
  NoModification
};
