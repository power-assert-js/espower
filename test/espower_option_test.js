var espower = require('../lib/espower'),
    esprima = require('esprima'),
    escodegen = require('escodegen'),
    assert = require('assert');


describe('espower.defaultOptions()', function () {
    beforeEach(function () {
        this.options = espower.defaultOptions();
    });
    it('destructive: false', function () {
        assert.equal(this.options.destructive, false);
    });
    it('powerAssertVariableName: "assert"', function () {
        assert.equal(this.options.powerAssertVariableName, 'assert');
    });
});


describe('instrumentation tests for options', function () {
    function instrument (jsCode, options) {
        var jsAST = esprima.parse(jsCode, {tolerant: true, loc: true, range: true});;
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
        destructiveOptionTest('default is false', {source: 'assert(falsyStr);'}, function (assert, before, tree, after) {
            assert.deepEqual(tree, before);
            assert.notDeepEqual(after, before);
            assert.notDeepEqual(after, tree);
        });
        destructiveOptionTest('destructive: false', {source: 'assert(falsyStr);', destructive: false}, function (assert, before, tree, after) {
            assert.deepEqual(tree, before);
            assert.notDeepEqual(after, before);
            assert.notDeepEqual(after, tree);
        });
        destructiveOptionTest('destructive: true', {source: 'assert(falsyStr);', destructive: true}, function (assert, before, tree, after) {
            assert.notDeepEqual(tree, before);
            assert.notDeepEqual(after, before);
            assert.deepEqual(after, tree);
        });
    });


    describe('source option and path option.', function () {
        it('path: null', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {source: 'assert(falsyStr);'});
            assert.equal(instrumentedCode, "assert(assert._expr(assert._capt(falsyStr,'ident',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(falsyStr);'));");
        });
        it('with source and path', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {source: 'assert(falsyStr);', path: '/path/to/baz_test.js'});
            assert.equal(instrumentedCode, "assert(assert._expr(assert._capt(falsyStr,'ident',{start:{line:1,column:7}}),{start:{line:1,column:7},path:'/path/to/baz_test.js'},'assert(falsyStr);'));");
        });
    });


    describe('powerAssertVariableName option.', function () {
        it('default is "assert"', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {source: 'assert(falsyStr);'});
            assert.equal(instrumentedCode, "assert(assert._expr(assert._capt(falsyStr,'ident',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(falsyStr);'));");
        });
        it('powerAssertVariableName: "test"', function () {
            var instrumentedCode = instrument('test.ok(falsyStr);', {source: 'test.ok(falsyStr);', powerAssertVariableName: 'test'});
            assert.equal(instrumentedCode, "test.ok(test._expr(test._capt(falsyStr,'ident',{start:{line:1,column:8}}),{start:{line:1,column:8}},'test.ok(falsyStr);'));");
        });
        it('not instrumented if powerAssertVariableName and actual variable name is different.', function () {
            var instrumentedCode = instrument('assert.ok(falsyStr);', {source: 'assert.ok(falsyStr);', powerAssertVariableName: 'test'});
            assert.equal(instrumentedCode, "assert.ok(falsyStr);");
        });
    });


    describe('lineSeparator option', function () {
        var lineDetected = "var falsyStr='';assert.ok(assert._expr(assert._capt(falsyStr,'ident',{start:{line:3,column:10}}),{start:{line:3,column:10}},'assert.ok(falsyStr);'));",
            lineNotDetected = "var falsyStr='';assert.ok(assert._expr(assert._capt(falsyStr,'ident',{start:{line:3,column:10}}),{start:{line:3,column:10}}));";
        function lineSeparatorTest (name, lineSeparatorInCode, options, expected) {
            it(name, function () {
                var sourceLines = [
                    'var falsyStr = "";',
                    '// comment line',
                    'assert.ok(falsyStr);'
                ].join(lineSeparatorInCode);
                options.source = sourceLines;
                assert.equal(instrument(sourceLines, options), expected);
            });
        }
        context('code: LF', function () {
            function when (name, opt, expected) {
                lineSeparatorTest(name, '\n', opt, expected);
            }
            when('option: default', {},                   lineDetected);
            when('option: LF',   {lineSeparator: '\n'},   lineDetected);
            when('option: CR',   {lineSeparator: '\r'},   lineNotDetected);
            when('option: CRLF', {lineSeparator: '\r\n'}, lineNotDetected);
        });
        context('code: CR', function () {
            function when (name, opt, expected) {
                lineSeparatorTest(name, '\r', opt, expected);
            }
            when('option: default', {},                   lineNotDetected);
            when('option: LF',   {lineSeparator: '\n'},   lineNotDetected);
            when('option: CR',   {lineSeparator: '\r'},   lineDetected);
            when('option: CRLF', {lineSeparator: '\r\n'}, lineNotDetected);
        });
        context('code: CRLF', function () {
            function when (name, opt, expected) {
                lineSeparatorTest(name, '\r\n', opt, expected);
            }
            when('option: default', {},                   lineDetected);
            when('option: LF',   {lineSeparator: '\n'},   lineDetected);
            when('option: CR',   {lineSeparator: '\r'},   "var falsyStr='';assert.ok(assert._expr(assert._capt(falsyStr,'ident',{start:{line:3,column:10}}),{start:{line:3,column:10}},'\\nassert.ok(falsyStr);'));");
            when('option: CRLF', {lineSeparator: '\r\n'}, lineDetected);
        });
    });
});


describe('option prerequisites. Error should be thrown if source is missing.', function () {
    beforeEach(function () {
        this.tree = esprima.parse('assert(falsyStr);', {tolerant: true, loc: true, range: true});
    });
    it('error message when path option is not specified', function () {
        try {
            espower(this.tree, {destructive: false, powerAssertVariableName: 'assert'});
            assert.ok(false, 'Error should be thrown');
        } catch (e) {
            assert.equal(e.name, 'Error');
            assert.equal(e.message, 'Target source code content should be specified by options.source.');
        }
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


describe('location information', function () {
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
