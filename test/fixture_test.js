'use strict';

var espower = require('..');
var acorn = require('acorn');
var esprima = require('esprima');
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var assert = require('assert');
var fs = require('fs');
var path = require('path');

function testWithParser (fixtureName, parse, manipulate) {
  it(parse.name + ' and ' + manipulate.name + ' on ' + fixtureName, function () {
    var fixtureFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'fixture.js');
    var expectedFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'expected.js');
    var actualFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'actual.js');

    var jsAST = parse(fs.readFileSync(fixtureFilepath, 'utf8'));
    var espoweredAST = manipulate(jsAST, { ecmaVersion: 2018, path: 'path/to/some_test.js', parse: parse });
    var output = escodegen.generate(espoweredAST);

    var actual = output + '\n';
    var expected = fs.readFileSync(expectedFilepath, 'utf8').replace(/\r/g, '');
    if (actual !== expected) {
      fs.writeFileSync(actualFilepath, actual);
    }
    assert.strictEqual(actual, expected);
  });
}

function testTransform (fixtureName, extraOptions) {
  function byAcorn (code) {
    var parserOptions = { ecmaVersion: 2018, locations: true, plugins: { asyncawait: true } };
    return acorn.parse(code, parserOptions);
  }
  function byEsprima (code) {
    var parserOptions = { tolerant: true, loc: true };
    return esprima.parse(code, parserOptions);
  }
  function byEspower (ast, options) {
    return espower(ast, options);
  }
  function byEstraverseAndVisitor (ast, options) {
    return estraverse.replace(ast, espower.createVisitor(ast, options));
  }
  testWithParser(fixtureName, byAcorn, byEspower);
  testWithParser(fixtureName, byAcorn, byEstraverseAndVisitor);
  if (fixtureName !== 'AwaitExpression') {
    testWithParser(fixtureName, byEsprima, byEspower);
    testWithParser(fixtureName, byEsprima, byEstraverseAndVisitor);
  }
}

describe('fixtures', function () {
  testTransform('WithoutUseStrict');
  testTransform('WithoutRequireAssert');
  testTransform('WithoutUseStrictNorRequireAssert');
  testTransform('Mocha');
  testTransform('NonTarget');
  testTransform('Literal');
  testTransform('Identifier');
  testTransform('BinaryExpression');
  testTransform('UnaryExpression');
  testTransform('MemberExpression');
  testTransform('CallExpression');
  testTransform('NewExpression');
  testTransform('ArrayExpression');
  testTransform('ObjectExpression');
  testTransform('Property');
  testTransform('LogicalExpression');
  testTransform('ConditionalExpression');
  testTransform('AssignmentExpression');
  testTransform('UpdateExpression');
  testTransform('SequenceExpression');
  testTransform('FunctionExpression');
  testTransform('ArrowFunctionExpression');
  testTransform('ClassExpression');
  testTransform('TemplateLiteral');
  testTransform('TaggedTemplateExpression');
  testTransform('SpreadElement');
  testTransform('YieldExpression');
  testTransform('AwaitExpression');
  testTransform('ClassScope');
  testTransform('Scopes');
});
