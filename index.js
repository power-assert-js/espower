/**
 * espower - Power Assert feature instrumentor based on the ECMAScript AST.
 *
 * https://github.com/power-assert-js/espower
 *
 * Copyright (c) 2013-2015 Takuto Wada
 * Licensed under the MIT license.
 *   https://github.com/power-assert-js/espower/blob/master/MIT-LICENSE.txt
 */
'use strict';

var defaultOptions = require('./lib/default-options');
var Instrumentor = require('./lib/instrumentor');
var extend = require('xtend');

/**
 * Instrument power assert feature into code. ECMAScript AST in, ECMAScript AST out.
 * @param {object} originalAst JavaScript ECMAScript JS AST to instrument (directly modified if destructive option is truthy)
 * @param {object} options Instrumentation options.
 * @returns {object} instrumented AST
 * @throws {EspowerError} if `originalAst` is already instrumented
 * @throws {EspowerError} if `originalAst` does not contain location information
 * @throws {EspowerError} if `options` is not valid
 */
function espower (originalAst, options) {
    var instrumentor = new Instrumentor(extend(defaultOptions(), options));
    return instrumentor.instrument(originalAst);
}

espower.defaultOptions = defaultOptions;
espower.Instrumentor = Instrumentor;
espower.AssertionVisitor = require('./lib/assertion-visitor');
espower.EspowerError = require('./lib/espower-error');
module.exports = espower;
