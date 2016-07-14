'use strict';

var espower = require('..');
var acorn = require('acorn');
require('acorn-es7-plugin')(acorn);
var esprima = require('esprima');
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var extend = require('xtend');


function testWithParser (fixtureName, parse, manipulate) {
    it(parse.name + ' and ' + manipulate.name + ' on ' + fixtureName, function () {
        var fixtureFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'fixture.js');
        var expectedFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'expected.js');
        var actualFilepath = path.resolve(__dirname, 'fixtures', fixtureName, 'actual.js');

        var jsAST = parse(fixtureFilepath);
        var espoweredAST = manipulate(jsAST, {path: 'path/to/some_test.js'});
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
    function by_acorn (filepath) {
        var parserOptions = {ecmaVersion: 7, locations: true, plugins: { asyncawait: true }};
        return acorn.parse(fs.readFileSync(filepath, 'utf8'), parserOptions);
    }
    function by_esprima (filepath) {
        var parserOptions = {tolerant: true, loc: true};
        return esprima.parse(fs.readFileSync(filepath, 'utf8'), parserOptions);
    }
    function by_espower (ast, options) {
        return espower(ast, options);
    }
    function by_estraverse_and_visitor (ast, options) {
        return estraverse.replace(ast, espower.createVisitor(ast, options));
    }
    testWithParser(fixtureName, by_acorn, by_espower);
    testWithParser(fixtureName, by_acorn, by_estraverse_and_visitor);
    if (fixtureName !== 'AwaitExpression') {
        testWithParser(fixtureName, by_esprima, by_espower);
        testWithParser(fixtureName, by_esprima, by_estraverse_and_visitor);
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
});
