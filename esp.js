var espower = require('./index'),
    esprima = require('esprima'),
    escodegen = require('escodegen');

var jsCode = process.argv[2];
var jsAst = esprima.parse(jsCode, {tolerant: true, loc: true, tokens: true});
var modifiedAst = espower(jsAst);

console.log(escodegen.generate(modifiedAst));
