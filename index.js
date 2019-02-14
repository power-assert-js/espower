/**
 * espower - Power Assert feature instrumentor based on the ECMAScript AST.
 *
 * https://github.com/power-assert-js/espower
 *
 * Copyright (c) 2013-2019 Takuto Wada
 * Licensed under the MIT license.
 *   https://github.com/power-assert-js/espower/blob/master/MIT-LICENSE.txt
 */
'use strict';

const defaultOptions = require('./lib/default-options');
const Instrumentor = require('./lib/instrumentor');

/**
 * Instrument power assert feature into code. ECMAScript AST in, ECMAScript AST out.
 *
 * @param {object} ast ECMAScript AST to be instrumented (directly modified)
 * @param {object} options Instrumentation options.
 * @returns {object} instrumented AST
 * @throws {Error} if `ast` is already instrumented
 * @throws {Error} if `ast` does not contain location information
 * @throws {Error} if `options` is not valid
 */
const espower = (ast, options) => {
  const instrumentor = new Instrumentor(Object.assign(defaultOptions(), options));
  return instrumentor.instrument(ast);
};

/**
 * Generate visitor object to be used with `estraverse.replace`
 *
 * @param {object} ast ECMAScript AST to be instrumented (directly modified)
 * @param {object} options Instrumentation options.
 * @returns {object} visitor object for estraverse
 * @throws {Error} if `ast` is already instrumented
 * @throws {Error} if `ast` does not contain location information
 * @throws {Error} if `options` is not valid
 */
const createVisitor = (ast, options) => {
  const instrumentor = new Instrumentor(Object.assign(defaultOptions(), options));
  return instrumentor.createVisitor(ast);
};

espower.createVisitor = createVisitor;
espower.defaultOptions = defaultOptions;
module.exports = espower;
