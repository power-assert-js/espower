'use strict';

var espower = require('..');
var acorn = require('acorn');
require('acorn-es7-plugin')(acorn);
var escodegen = require('escodegen');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var extend = require('xtend');

function testTransform (fixtureName, extraOptions) {
    it(fixtureName, function () {
        var fixtureFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'fixture.js');
        var expectedFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'expected.js');
        var actualFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'actual.js');

        var parserOptions = {ecmaVersion: 7, locations: true, plugins: { asyncawait: true }};
        var jsAST = acorn.parse(fs.readFileSync(fixtureFilepath, 'utf8'), parserOptions);
        var espoweredAST = espower(jsAST, {path: 'path/to/some_test.js'});
        var output = escodegen.generate(espoweredAST);

        var actual = output + '\n';
        var expected = fs.readFileSync(expectedFilepath, 'utf8');
        if (actual != expected) {
            fs.writeFileSync(actualFilepath, actual);
        }
        assert.equal(actual, expected);
    });
}

describe('espower', function () {
    testTransform('Mocha');
    testTransform('NonTarget');
    testTransform('Literal');
    testTransform('Identifier');
    testTransform('BinaryExpression');
    testTransform('UnaryExpression');
    testTransform('LogicalExpression');
    testTransform('MemberExpression');
    testTransform('CallExpression');
    testTransform('AssignmentExpression');
    testTransform('ArrayExpression');
    testTransform('UpdateExpression');
    testTransform('ConditionalExpression');
    testTransform('ObjectExpression');
    testTransform('NewExpression');
    testTransform('FunctionExpression');
    testTransform('TemplateLiteral');
    testTransform('TaggedTemplateExpression');
    testTransform('ArrowFunctionExpression');
    testTransform('ClassExpression');
    testTransform('SpreadElement');
    testTransform('Property');
    testTransform('YieldExpression');
});

describe.only('recorder per argument', function () {
    testTransform('Mocha');
    testTransform('Identifier');
});
