var espower = require('./index');
var acorn = require('acorn');
var escodegen = require('escodegen');

var jsCode = process.argv[2];
var parserOptions = {ecmaVersion: 6, locations: true};
var jsAst = acorn.parse(jsCode, parserOptions);
var modifiedAst = espower(jsAst);

console.log(escodegen.generate(modifiedAst));
