'use strict';

const { createNewRecorder, NodeCreator } = require('./create-node');
const toBeCaptured = require('./rules/to-be-captured');

class ArgumentModification {
  constructor ({ options, assertionPath, calleeNode, matchIndex, metadataIdent }) {
    this.options = options;
    this.assertionPath = assertionPath;
    this.calleeNode = calleeNode;
    this.matchIndex = matchIndex;
    this.metadataIdent = metadataIdent;
    this.argumentModified = false;
  }

  enter (controller) {
    // create recorder per argument
    this.argumentRecorderIdent = createNewRecorder(Object.assign({
      controller,
      calleeNode: this.calleeNode,
      matchIndex: this.matchIndex,
      metadataIdent: this.metadataIdent
    }, this.options));
    // entering target argument
    this.currentArgumentPath = [].concat(controller.path());
  }

  leave (controller) {
    const shouldCapture = this.isArgumentModified() || toBeCaptured(controller);
    return shouldCapture ? this.captureArgument(controller) : controller.current();
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
  leave (controller) {
    return undefined;
  }
  isCapturing () {
    return false;
  }
  isLeaving (controller) {
    return isPathIdentical(this.currentArgumentPath, controller.path());
  }
  isArgumentModified () {
    return false;
  }
}

const isPathIdentical = (path1, path2) => {
  if (!path1 || !path2) {
    return false;
  }
  return path1.join('/') === path2.join('/');
};

module.exports = {
  ArgumentModification,
  NoModification
};
