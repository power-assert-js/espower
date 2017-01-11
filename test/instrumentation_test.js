'use strict';

var espower = require('..');
var acorn = require('acorn');
require('acorn-es7-plugin')(acorn);
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var assert = require('assert');

describe('instrumentation spec', function () {
    function rec(num) {
        return 'var _rec' + num + '=new _PowerAssertRecorder1();';
    }
    function prelude(num) {
        var decl = "var _PowerAssertRecorder1=function(){function PowerAssertRecorder(){this.captured=[];}PowerAssertRecorder.prototype._capt=function _capt(value,espath){this.captured.push({value:value,espath:espath});return value;};PowerAssertRecorder.prototype._expr=function _expr(value,source){return{powerAssertContext:{value:value,events:this.captured},source:source};};return PowerAssertRecorder;}();";
        for (var i = 1; i <= num; i+=1) {
            decl += rec(i);
        }
        return decl;
    }

    function testWithParserOptions (jsCode, expected, options) {
        it(jsCode, function () {
            var jsAST = acorn.parse(jsCode, options);
            var espoweredAST = espower(jsAST, {path: 'path/to/some_test.js'});
            var instrumentedCode = escodegen.generate(espoweredAST, {format: {compact: true}});
            assert.equal(instrumentedCode, expected);
            assert(acorn.parse(instrumentedCode, options));
        });
    }

    function inst (jsCode, expected) {
        describe('with loc, range', function () {
            var options = {ecmaVersion: 7, locations: true, ranges: true, plugins: {asyncawait: true}};
            testWithParserOptions(jsCode, expected, options);
        });
        describe('with loc', function () {
            var options = {ecmaVersion: 7, locations: true, plugins: {asyncawait: true}};
            testWithParserOptions(jsCode, expected, options);
        });
    }


    describe('ES6', function () {

        describe('disambiguation: YieldExpression vs FunctionCall', function () {
            inst("function baz() {assert((yield (foo)) === bar)}",
                 prelude(0) + "function baz(){" + rec(1) + "assert(_rec1._expr(_rec1._capt(_rec1._capt(yield(_rec1._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(yield(foo) === bar)',filepath:'path/to/some_test.js',line:1}));}");

            inst("function *baz() {assert((yield (foo)) === bar)}",
                 prelude(0) + "function*baz(){" + rec(1) + "assert(_rec1._expr(_rec1._capt(_rec1._capt(yield foo,'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((yield foo) === bar)',filepath:'path/to/some_test.js',line:1,generator:true}));}");

            inst("var baz = function () {assert((yield (foo)) === bar)}",
                 prelude(0) + "var baz=function(){" + rec(1) + "assert(_rec1._expr(_rec1._capt(_rec1._capt(yield(_rec1._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(yield(foo) === bar)',filepath:'path/to/some_test.js',line:1}));};");

            inst("var baz = function *() {assert((yield (foo)) === bar)}",
                 prelude(0) + "var baz=function*(){" + rec(1) + "assert(_rec1._expr(_rec1._capt(_rec1._capt(yield foo,'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((yield foo) === bar)',filepath:'path/to/some_test.js',line:1,generator:true}));};");
        });

        describe('disambiguation: AwaitExpression vs FunctionCall', function () {
            inst("function baz() {assert((await (foo)) === bar)}",
                 prelude(0) + "function baz(){" + rec(1) + "assert(_rec1._expr(_rec1._capt(_rec1._capt(await(_rec1._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(await(foo) === bar)',filepath:'path/to/some_test.js',line:1}));}");

            inst("async function baz() {assert((await (foo)) === bar)}",
                 prelude(0) + "async function baz(){" + rec(1) + "assert(_rec1._expr(_rec1._capt(_rec1._capt(await foo,'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((await foo) === bar)',filepath:'path/to/some_test.js',line:1,async:true}));}");

            inst("var baz = function () {assert((await (foo)) === bar)}",
                 prelude(0) + "var baz=function(){" + rec(1) + "assert(_rec1._expr(_rec1._capt(_rec1._capt(await(_rec1._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(await(foo) === bar)',filepath:'path/to/some_test.js',line:1}));};");

            inst("var baz = async function () {assert((await (foo)) === bar)}",
                 prelude(0) + "var baz=async function(){" + rec(1) + "assert(_rec1._expr(_rec1._capt(_rec1._capt(await foo,'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((await foo) === bar)',filepath:'path/to/some_test.js',line:1,async:true}));};");

            inst("var baz = () => {assert((await (foo)) === bar)};",
                 prelude(0) + "var baz=()=>{" + rec(1) + "assert(_rec1._expr(_rec1._capt(_rec1._capt(await(_rec1._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(await(foo) === bar)',filepath:'path/to/some_test.js',line:1}));};");

            inst("var baz = async () => {assert((await (foo)) === bar)}",
                 prelude(0) + "var baz=async()=>{" + rec(1) + "assert(_rec1._expr(_rec1._capt(_rec1._capt(await foo,'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((await foo) === bar)',filepath:'path/to/some_test.js',line:1,async:true}));};");
        });

    });

});
