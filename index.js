/**
 * espower - Power Assert feature instrumentor based on the Mozilla JavaScript AST.
 *
 * https://github.com/twada/espower
 *
 * Copyright (c) 2013-2015 Takuto Wada
 * Licensed under the MIT license.
 *   https://github.com/twada/espower/blob/master/MIT-LICENSE.txt
 */
'use strict';

var defaultOptions = require('./lib/default-options'),
    Instrumentor = require('./lib/instrumentor'),
    extend = require('xtend');

/**
 * Instrument power assert feature into code. Mozilla JS AST in, Mozilla JS AST out.
 * @param {object} originalAst JavaScript Mozilla JS AST to instrument (directly modified if destructive option is truthy)
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
espower.rules = {
    supportedNodeTypes: require('./lib/rules/supported-node-types'),
    toBeSkipped: require('./lib/rules/to-be-skipped'),
    toBeCaptured: require('./lib/rules/to-be-captured')
};
module.exports = espower;
