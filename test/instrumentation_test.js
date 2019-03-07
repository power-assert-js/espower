'use strict';

const assert = require('assert');
const acorn = require('acorn');
require('acorn-es7-plugin')(acorn);
const escodegen = require('escodegen');
const espower = require('..');
const transpile = (code, extraOptions) => {
  const options = {ecmaVersion: 2018, locations: true, ranges: true, plugins: {asyncawait: true}};
  const ast = acorn.parse(code, options);
  const espoweredAST = espower(ast, Object.assign({ path: 'path/to/some_test.js', parse: acorn.parse }, extraOptions));
  const result = escodegen.generate(espoweredAST, {format: {compact: true}});
  const lines = result.split('\n');
  const lastLine = lines[lines.length - 1];
  return {
    result,
    lastLine
  };
};

describe('instrumentation spec', function () {

    function testWithParserOptions (jsCode, expected, options) {
        it(jsCode, function () {
            const { lastLine } = transpile(jsCode, { patterns: ['assert(value, [message])'] });
            const startAt = lastLine.length - expected.length;
            const endAt = lastLine.length;
            assert.strictEqual(lastLine.substring(startAt, endAt), expected);
        });
    }

    function inst (jsCode, expected) {
      testWithParserOptions(jsCode, expected);
    }

    describe('spike disambiguation: YieldExpression vs FunctionCall', function () {
        inst("function baz() {assert((yield (foo)) === bar)}",
             "function baz(){var _am1=_pwmeta1(0,'assert(yield(foo) === bar)','path/to/some_test.js',1);var _ag1=new _ArgumentRecorder1(assert,_am1,0);assert(_ag1._rec(_ag1._tap(yield(_ag1._tap(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_ag1._tap(bar,'arguments/0/right'),'arguments/0'));}");

        inst("function *baz() {assert((yield (foo)) === bar)}",
             "function*baz(){var _am1=_pwmeta1(0,'assert((yield foo) === bar)','path/to/some_test.js',1,{generator:true});var _ag1=new _ArgumentRecorder1(assert,_am1,0);assert(_ag1._rec(_ag1._tap(yield foo,'arguments/0/left')===_ag1._tap(bar,'arguments/0/right'),'arguments/0'));}");

        inst("var baz = function () {assert((yield (foo)) === bar)}",
             "var baz=function(){var _am1=_pwmeta1(0,'assert(yield(foo) === bar)','path/to/some_test.js',1);var _ag1=new _ArgumentRecorder1(assert,_am1,0);assert(_ag1._rec(_ag1._tap(yield(_ag1._tap(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_ag1._tap(bar,'arguments/0/right'),'arguments/0'));};");

        inst("var baz = function *() {assert((yield (foo)) === bar)}",
             "var baz=function*(){var _am1=_pwmeta1(0,'assert((yield foo) === bar)','path/to/some_test.js',1,{generator:true});var _ag1=new _ArgumentRecorder1(assert,_am1,0);assert(_ag1._rec(_ag1._tap(yield foo,'arguments/0/left')===_ag1._tap(bar,'arguments/0/right'),'arguments/0'));};");
    });


    describe('disambiguation: AwaitExpression vs FunctionCall', function () {
        inst("function baz() {assert((await (foo)) === bar)}",
             "function baz(){var _am1=_pwmeta1(0,'assert(await(foo) === bar)','path/to/some_test.js',1);var _ag1=new _ArgumentRecorder1(assert,_am1,0);assert(_ag1._rec(_ag1._tap(await(_ag1._tap(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_ag1._tap(bar,'arguments/0/right'),'arguments/0'));}");

        inst("async function baz() {assert((await (foo)) === bar)}",
             "async function baz(){var _am1=_pwmeta1(0,'assert(await foo === bar)','path/to/some_test.js',1,{async:true});var _ag1=new _ArgumentRecorder1(assert,_am1,0);assert(_ag1._rec(_ag1._tap(await foo,'arguments/0/left')===_ag1._tap(bar,'arguments/0/right'),'arguments/0'));}");

        inst("var baz = function () {assert((await (foo)) === bar)}",
             "var baz=function(){var _am1=_pwmeta1(0,'assert(await(foo) === bar)','path/to/some_test.js',1);var _ag1=new _ArgumentRecorder1(assert,_am1,0);assert(_ag1._rec(_ag1._tap(await(_ag1._tap(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_ag1._tap(bar,'arguments/0/right'),'arguments/0'));};");

        inst("var baz = async function () {assert((await (foo)) === bar)}",
             "var baz=async function(){var _am1=_pwmeta1(0,'assert(await foo === bar)','path/to/some_test.js',1,{async:true});var _ag1=new _ArgumentRecorder1(assert,_am1,0);assert(_ag1._rec(_ag1._tap(await foo,'arguments/0/left')===_ag1._tap(bar,'arguments/0/right'),'arguments/0'));};");

        inst("var baz = () => {assert((await (foo)) === bar)};",
             "var baz=()=>{var _am1=_pwmeta1(0,'assert(await(foo) === bar)','path/to/some_test.js',1);var _ag1=new _ArgumentRecorder1(assert,_am1,0);assert(_ag1._rec(_ag1._tap(await(_ag1._tap(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_ag1._tap(bar,'arguments/0/right'),'arguments/0'));};");

        inst("var baz = async () => {assert((await (foo)) === bar)}",
             "var baz=async()=>{var _am1=_pwmeta1(0,'assert(await foo === bar)','path/to/some_test.js',1,{async:true});var _ag1=new _ArgumentRecorder1(assert,_am1,0);assert(_ag1._rec(_ag1._tap(await foo,'arguments/0/left')===_ag1._tap(bar,'arguments/0/right'),'arguments/0'));};");
    });

});
