'use strict';

const { createNewRecorder, NodeCreator } = require('./create-node');

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
    this.valueRecorder = createNewRecorder(Object.assign({
      controller
    }, this.options));
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
