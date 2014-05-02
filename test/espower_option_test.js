(function (root, factory) {
    'use strict';

    var dependencies = [
        '../lib/espower',
        'esprima',
        'escodegen',
        'estraverse',
        'assert'
    ];

    if (typeof define === 'function' && define.amd) {
        define(dependencies, factory);
    } else if (typeof exports === 'object') {
        factory.apply(root, dependencies.map(function (path) { return require(path); }));
    } else {
        factory.apply(root, dependencies.map(function (path) {
            var tokens = path.split('/');
            return root[tokens[tokens.length - 1]];
        }));
    }
}(this, function (
    espower,
    esprima,
    escodegen,
    estraverse,
    assert
) {

// see: https://github.com/Constellation/escodegen/issues/115
if (typeof define === 'function' && define.amd) {
    escodegen = window.escodegen;
}


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
        var jsAST = esprima.parse(jsCode, {tolerant: true, loc: true, tokens: true, raw: true});
        var espoweredAST = espower(jsAST, options);
        var instrumentedCode = escodegen.generate(espoweredAST, {format: {compact: true}});
        return instrumentedCode;
    }


    describe('destructive option', function () {
        function destructiveOptionTest (testName, option, callback) {
            it(testName, function () {
                var tree = esprima.parse('assert(falsyStr);', {tolerant: true, loc: true, range: true, tokens: true, raw: true}),
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
            assert.equal(instrumentedCode, "assert(assert._expr(assert._capt(falsyStr,'arguments/0'),{content:'assert(falsyStr)',line:1}));");
        });
        it('with source and path', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {source: 'assert(falsyStr);', path: '/path/to/baz_test.js'});
            assert.equal(instrumentedCode, "assert(assert._expr(assert._capt(falsyStr,'arguments/0'),{content:'assert(falsyStr)',filepath:'/path/to/baz_test.js',line:1}));");
        });
    });


    describe('powerAssertVariableName option.', function () {
        it('default is "assert"', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {source: 'assert(falsyStr);'});
            assert.equal(instrumentedCode, "assert(assert._expr(assert._capt(falsyStr,'arguments/0'),{content:'assert(falsyStr)',line:1}));");
        });
        it('powerAssertVariableName: "test"', function () {
            var instrumentedCode = instrument('test.ok(falsyStr);', {source: 'test.ok(falsyStr);', powerAssertVariableName: 'test'});
            assert.equal(instrumentedCode, "test.ok(test._expr(test._capt(falsyStr,'arguments/0'),{content:'test.ok(falsyStr)',line:1}));");
        });
        it('not instrumented if powerAssertVariableName and actual variable name is different.', function () {
            var instrumentedCode = instrument('assert.ok(falsyStr);', {source: 'assert.ok(falsyStr);', powerAssertVariableName: 'test'});
            assert.equal(instrumentedCode, "assert.ok(falsyStr);");
        });
    });


    describe('lineSeparator', function () {
        var lineDetected = "var falsyStr='';assert.ok(assert._expr(assert._capt(falsyStr,'arguments/0'),{content:'assert.ok(falsyStr)',line:3}));";

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
        });
        context('code: CR', function () {
            function when (name, opt, expected) {
                lineSeparatorTest(name, '\r', opt, expected);
            }
            when('option: default', {},                   lineDetected);
        });
        context('code: CRLF', function () {
            function when (name, opt, expected) {
                lineSeparatorTest(name, '\r\n', opt, expected);
            }
            when('option: default', {},                   lineDetected);
        });
    });
});


describe('option prerequisites', function () {
    beforeEach(function () {
        this.tree = esprima.parse('assert(falsyStr);', {tolerant: true, loc: true, range: true, tokens: true, raw: true});
    });
    function optionPrerequisitesTest (name, options, expected) {
        it(name, function () {
            try {
                espower(this.tree, options);
                assert.ok(false, 'Error should be thrown');
            } catch (e) {
                assert.equal(e.name, 'Error');
                assert.equal(e.message, expected);
            }
        });
    }

    optionPrerequisitesTest('destructive option is undefined',
                            {source: 'assert(falsyStr);', destructive: undefined},
                            'options.destructive should be specified.');

    optionPrerequisitesTest('powerAssertVariableName option is undefined',
                            {source: 'assert(falsyStr);', powerAssertVariableName: undefined},
                            'options.powerAssertVariableName should be specified.');

    optionPrerequisitesTest('targetMethods option is undefined',
                            {source: 'assert(falsyStr);', targetMethods: undefined},
                            'options.targetMethods should be specified.');

    optionPrerequisitesTest('targetMethods.oneArg option is undefined',
                            {source: 'assert(falsyStr);', targetMethods: { twoArgs: ['equal'] }},
                            'options.targetMethods.oneArg should be specified.');

    optionPrerequisitesTest('targetMethods.twoArgs option is undefined',
                            {source: 'assert(falsyStr);', targetMethods: { oneArg: ['ok'] }},
                            'options.targetMethods.twoArgs should be specified.');
});


describe('AST prerequisites. Error should be thrown if location is missing.', function () {
    beforeEach(function () {
        this.jsCode = 'assert(falsyStr);';
        this.tree = esprima.parse(this.jsCode, {tolerant: true, loc: false, tokens: true, raw: true});
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
            tree = esprima.parse(jsCode, {tolerant: true, loc: true, range: true, tokens: true, raw: true}),
            saved = espower.deepCopy(tree),
            result = espower(tree, {destructive: false, source: jsCode, path: '/path/to/baz_test.js'});
        estraverse.traverse(result, function (node) {
            if (typeof node.type === 'undefined') return;
            assert.ok(node.loc !== 'undefined', 'type: ' + node.type);
            assert.ok(typeof node.range !== 'undefined', 'type: ' + node.type);
        });
    });
});

}));
