'use strict';

const getParentNode = (controller) => {
  const parents = controller.parents();
  return parents[parents.length - 1];
};

const getCurrentKey = (controller) => {
  const path = controller.path();
  return path ? path[path.length - 1] : null;
};

module.exports = {
  getParentNode,
  getCurrentKey
};
