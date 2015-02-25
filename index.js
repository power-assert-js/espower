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
    clone = require('clone'),
    extend = require('xtend');

/**
 * Instrument power assert feature into code. Mozilla JS AST in, Mozilla JS AST out.
 * @param {object} originalAst JavaScript Mozilla JS AST to instrument (directly modified if destructive option is truthy)
 * @param {object} options Instrumentation options.
 * @returns {object} instrumented AST
 * @throws {Error} if `originalAst` is already instrumented
 * @throws {Error} if `originalAst` does not contain location information
 * @throws {Error} if `options` is not valid
 */
function espower (originalAst, options) {
    var instrumentor = new Instrumentor(extend(defaultOptions(), options));
    return instrumentor.instrument(originalAst);
}

espower.deepCopy = clone;
espower.defaultOptions = defaultOptions;
module.exports = espower;
