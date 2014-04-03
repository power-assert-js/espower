var espower = require('./lib/espower'),
    esprima = require('esprima'),
    escodegen = require('escodegen'),
    jsCode = process.argv[2],
    options = {tolerant: true, loc: true, tokens: true},
    jsAST = esprima.parse(jsCode, options),
    espoweredAST = espower(jsAST, {source: jsCode});

console.log(escodegen.generate(espoweredAST, {format: {compact: true}}));
