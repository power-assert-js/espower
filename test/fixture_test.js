'use strict';

var espower = require('..');
var acorn = require('acorn');
require('acorn-es7-plugin')(acorn);
var esprima = require('esprima');
var escodegen = require('escodegen');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var extend = require('xtend');


function testWithParser (fixtureName, parse) {
    it(parse.name + ' ' + fixtureName, function () {
        var fixtureFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'fixture.js');
        var expectedFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'expected.js');
        var actualFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'actual.js');

        var jsAST = parse(fixtureFilepath);
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

function testTransform (fixtureName, extraOptions) {
    testWithParser(fixtureName, function by_acorn (filepath) {
        var parserOptions = {ecmaVersion: 7, locations: true, plugins: { asyncawait: true }};
        return acorn.parse(fs.readFileSync(filepath, 'utf8'), parserOptions);
    });
    if (fixtureName !== 'AwaitExpression') {
        testWithParser(fixtureName, function by_esprima (filepath) {
            var parserOptions = {tolerant: true, loc: true};
            return esprima.parse(fs.readFileSync(filepath, 'utf8'), parserOptions);
        });
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
    testTransform('FunctionExpression');
    testTransform('ArrowFunctionExpression');
    testTransform('ClassExpression');
    testTransform('TemplateLiteral');
    testTransform('TaggedTemplateExpression');
    testTransform('SpreadElement');
    testTransform('YieldExpression');
    testTransform('AwaitExpression');
});
