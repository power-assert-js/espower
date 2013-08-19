var espower = require('../lib/espower'),
    esprima = require('esprima'),
    escodegen = require('escodegen'),
    assert = require('assert');


describe('instrumentation tests for options', function () {
    function extractBodyFrom (source) {
        var tree = esprima.parse(source, {tolerant: true, loc: true, range: true});
        return tree.body[0];
    }
    function instrument (jsCode, options) {
            var jsAST = extractBodyFrom(jsCode);
            var espoweredAST = espower(jsAST, options);
            var instrumentedCode = escodegen.generate(espoweredAST, {format: {compact: true}});
        return instrumentedCode;
    }


    describe('destructive option', function () {
        function destructiveOptionTest (testName, option, callback) {
            it(testName, function () {
                var tree = esprima.parse('assert(falsyStr);', {tolerant: true, loc: true, range: true}),
                    saved = espower.deepCopy(tree),
                    result = espower(tree, option);
                callback(assert, saved, tree, result);
            });
        }
        destructiveOptionTest('default option', {}, function (assert, before, tree, after) {
            assert.deepEqual(tree, before);
            assert.notDeepEqual(after, before);
            assert.notDeepEqual(after, tree);
        });
        destructiveOptionTest('destructive: false', {destructive: false}, function (assert, before, tree, after) {
            assert.deepEqual(tree, before);
            assert.notDeepEqual(after, before);
            assert.notDeepEqual(after, tree);
        });
        destructiveOptionTest('destructive: true', {destructive: true}, function (assert, before, tree, after) {
            assert.notDeepEqual(tree, before);
            assert.notDeepEqual(after, before);
            assert.deepEqual(after, tree);
        });
    });


    describe('source option and path option.', function () {
        it('path: null, source: null', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {});
            assert.equal(instrumentedCode, "assert(assert.expr(assert.capture(falsyStr,'ident',{start:{line:1,column:7}}),{start:{line:1,column:7}}));");
        });
        it('source: null', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {path: '/path/to/baz_test.js'});
            assert.equal(instrumentedCode, "assert(assert.expr(assert.capture(falsyStr,'ident',{start:{line:1,column:7}}),{start:{line:1,column:7},path:'/path/to/baz_test.js'}));");
        });
        it('path: null', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {source: 'assert(falsyStr);'});
            assert.equal(instrumentedCode, "assert(assert.expr(assert.capture(falsyStr,'ident',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(falsyStr);'));");
        });
        it('with source and path', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {source: 'assert(falsyStr);', path: '/path/to/baz_test.js'});
            assert.equal(instrumentedCode, "assert(assert.expr(assert.capture(falsyStr,'ident',{start:{line:1,column:7}}),{start:{line:1,column:7},path:'/path/to/baz_test.js'},'assert(falsyStr);'));");
        });
    });


    describe('powerAssertVariableName option.', function () {
        it('default is "assert"', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {source: 'assert(falsyStr);'});
            assert.equal(instrumentedCode, "assert(assert.expr(assert.capture(falsyStr,'ident',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(falsyStr);'));");
        });
        it('powerAssertVariableName: "test"', function () {
            var instrumentedCode = instrument('test.ok(falsyStr);', {source: 'test.ok(falsyStr);', powerAssertVariableName: 'test'});
            assert.equal(instrumentedCode, "test.ok(test.expr(test.capture(falsyStr,'ident',{start:{line:1,column:8}}),{start:{line:1,column:8}},'test.ok(falsyStr);'));");
        });
        it('not instrumented if powerAssertVariableName and actual variable name is different.', function () {
            var instrumentedCode = instrument('assert.ok(falsyStr);', {source: 'assert.ok(falsyStr);', powerAssertVariableName: 'test'});
            assert.equal(instrumentedCode, "assert.ok(falsyStr);");
        });
    });
});



describe('AST prerequisites. Error should be thrown if location is missing.', function () {
    beforeEach(function () {
        this.jsCode = 'assert(falsyStr);';
        this.tree = esprima.parse(this.jsCode, {tolerant: true, loc: false});
    });
    it('error message when path option is not specified', function () {
        try {
            espower(this.tree, {destructive: false, source: this.jsCode, powerAssertVariableName: 'assert'});
            assert.ok(false, 'Error should be thrown');
        } catch (e) {
            assert.equal(e.name, 'Error');
            assert.equal(e.message, 'JavaScript AST should contain location information.');
        }
    });
    it('error message when path option is specified', function () {
        try {
            espower(this.tree, {destructive: false, source: this.jsCode, powerAssertVariableName: 'assert', path: '/path/to/baz_test.js'});
            assert.ok(false, 'Error should be thrown');
        } catch (e) {
            assert.equal(e.name, 'Error');
            assert.equal(e.message, 'JavaScript AST should contain location information. path: /path/to/baz_test.js');
        }
    });
});



describe('preserve location information', function () {
    it('preserve location of instrumented nodes.', function () {
        var jsCode = 'assert((three * (seven * ten)) === three);',
            tree = esprima.parse(jsCode, {tolerant: true, loc: true, range: true}),
            saved = espower.deepCopy(tree),
            result = espower(tree, {destructive: false, source: jsCode, path: '/path/to/baz_test.js'});
        espower.traverse(result, function (node) {
            if (typeof node.type === 'undefined') return;
            assert.ok(node.loc !== 'undefined', 'type: ' + node.type);
            assert.ok(typeof node.range !== 'undefined', 'type: ' + node.type);
        });
    });
});
