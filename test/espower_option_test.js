'use strict';

var espower = require('..');
var acorn = require('acorn');
require('acorn-es7-plugin')(acorn);
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var sourceMap = require('source-map');
var assert = require('assert');
var join = require('path').join;

var EspowerError = espower.EspowerError;

function instrument (jsCode, options) {
    var jsAST = acorn.parse(jsCode, {ecmaVersion: 7, locations: true, plugins: {asyncawait: true}});
    var espoweredAST = espower(jsAST, options);
    var instrumentedCode = escodegen.generate(espoweredAST, {format: {compact: true}});
    return instrumentedCode;
}

function rec(num) {
    return 'var _rec' + num + '=new _PowerAssertRecorder1();';
}
function prelude(num) {
    var decl = "var _PowerAssertRecorder1=function(){function PowerAssertRecorder(){this.captured=[];}PowerAssertRecorder.prototype._capt=function _capt(value,espath){this.captured.push({value:value,espath:espath});return value;};PowerAssertRecorder.prototype._expr=function _expr(value,source){var capturedValues=this.captured;this.captured=[];return{powerAssertContext:{value:value,events:capturedValues},source:source};};return PowerAssertRecorder;}();";
    for (var i = 1; i <= num; i+=1) {
        decl += rec(i);
    }
    return decl;
}

describe('espower.defaultOptions()', function () {
    beforeEach(function () {
        this.options = espower.defaultOptions();
    });
    it('destructive: undefined', function () {
        assert.equal(this.options.destructive, undefined);
    });
    it('ecmaVersion: 2016', function () {
        assert.equal(this.options.ecmaVersion, 2016);
    });
    it('sourceType: "module"', function () {
        assert.equal(this.options.sourceType, 'module');
    });
    it('patterns: Array', function () {
        assert.deepEqual(this.options.patterns, [
            'assert(value, [message])',
            'assert.ok(value, [message])',
            'assert.equal(actual, expected, [message])',
            'assert.notEqual(actual, expected, [message])',
            'assert.strictEqual(actual, expected, [message])',
            'assert.notStrictEqual(actual, expected, [message])',
            'assert.deepEqual(actual, expected, [message])',
            'assert.notDeepEqual(actual, expected, [message])',
            'assert.deepStrictEqual(actual, expected, [message])',
            'assert.notDeepStrictEqual(actual, expected, [message])'
        ]);
    });
});


describe('instrumentation tests for options', function () {

    /**
     * Copyright (C) 2012 Yusuke Suzuki (twitter: @Constellation) and other contributors.
     * Released under the BSD license.
     * https://github.com/Constellation/esmangle/blob/master/LICENSE.BSD
     */
    function deepCopy (obj) {
        var isArray = Array.isArray || function isArray (array) {
            return Object.prototype.toString.call(array) === '[object Array]';
        };
        function deepCopyInternal (obj, result) {
            var key, val;
            for (key in obj) {
                if (key.lastIndexOf('_', 0) === 0) {
                    continue;
                }
                if (obj.hasOwnProperty(key)) {
                    val = obj[key];
                    if (typeof val === 'object' && val !== null) {
                        if (val instanceof RegExp) {
                            val = new RegExp(val);
                        } else {
                            val = deepCopyInternal(val, isArray(val) ? [] : {});
                        }
                    }
                    result[key] = val;
                }
            }
            return result;
        }
        return deepCopyInternal(obj, isArray(obj) ? [] : {});
    }

    describe('deprecated: destructive option -> treated as destructive:true every time', function () {
        function destructiveOptionTest (testName, option, callback) {
            it(testName, function () {
                var tree = acorn.parse('assert(falsyStr);', {ecmaVersion: 6, locations: true, ranges: true});
                var saved = deepCopy(tree);
                var result = espower(tree, option);
                callback(assert, saved, tree, result);
            });
        }
        destructiveOptionTest('default is treated as destructive:true', {}, function (assert, before, tree, after) {
            assert.notDeepEqual(tree, before);
            assert.notDeepEqual(after, before);
            assert.deepEqual(after, tree);
        });
        it('options.destructive is deprecate and always treated as destructive:true', function () {
            var tree = acorn.parse('assert(falsyStr);', {ecmaVersion: 6, locations: true, ranges: true});
            assert.throws(function () {
                espower(tree, {destructive: false});
            }, EspowerError);
        });
        destructiveOptionTest('destructive: true', {destructive: true}, function (assert, before, tree, after) {
            assert.notDeepEqual(tree, before);
            assert.notDeepEqual(after, before);
            assert.deepEqual(after, tree);
        });
    });


    describe('patterns option.', function () {
        it('matches function call', function () {
            var instrumentedCode = instrument('refute(falsyStr);', {
                patterns: [
                    'refute(value)'
                ]
            });
            assert.equal(instrumentedCode,
                         prelude(1) + "refute(_rec1._expr(_rec1._capt(falsyStr,'arguments/0'),{content:'refute(falsyStr)',line:1}));");
        });

        it('matches method call', function () {
            var instrumentedCode = instrument('refute.equal(foo, bar);', {
                patterns: [
                    'refute.equal(actual, expected)'
                ]
            });
            assert.equal(instrumentedCode,
                         prelude(2) + "refute.equal(_rec1._expr(_rec1._capt(foo,'arguments/0'),{content:'refute.equal(foo, bar)',line:1}),_rec2._expr(_rec2._capt(bar,'arguments/1'),{content:'refute.equal(foo, bar)',line:1}));");
        });

        it('deep callee chain', function () {
            var instrumentedCode = instrument('browser.assert.element(foo);', {
                patterns: [
                    'browser.assert.element(selection, [message])'
                ]
            });
            assert.equal(instrumentedCode,
                         prelude(1) + "browser.assert.element(_rec1._expr(_rec1._capt(foo,'arguments/0'),{content:'browser.assert.element(foo)',line:1}));");
        });
    });


    describe('path option.', function () {
        it('path: null', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {});
            assert.equal(instrumentedCode,
                         prelude(1) + "assert(_rec1._expr(_rec1._capt(falsyStr,'arguments/0'),{content:'assert(falsyStr)',line:1}));");
        });
        it('with path', function () {
            var instrumentedCode = instrument('assert(falsyStr);', {path: 'path/to/baz_test.js'});
            assert.equal(instrumentedCode,
                         prelude(1) + "assert(_rec1._expr(_rec1._capt(falsyStr,'arguments/0'),{content:'assert(falsyStr)',filepath:'path/to/baz_test.js',line:1}));");
        });
    });
});


describe('option prerequisites', function () {
    beforeEach(function () {
        this.tree = acorn.parse('assert(falsyStr);', {ecmaVersion: 6, locations: true, ranges: true});
    });
    function optionPrerequisitesTest (name, options, expected) {
        it(name, function () {
            try {
                espower(this.tree, options);
                assert.ok(false, 'Error should be thrown');
            } catch (e) {
                assert.equal(e.message, expected);
                assert.equal(e.name, 'EspowerError');
                assert(e instanceof Error);
                assert(e instanceof EspowerError);
                assert(e.stack);
            }
        });
    }

    optionPrerequisitesTest('patterns option should be an array',
                            {patterns: 'hoge'},
                            '[espower] options.patterns should be an array.');
});


describe('AST prerequisites. Error should be thrown if location is missing.', function () {
    beforeEach(function () {
        this.jsCode = 'assert(falsyStr);';
        this.tree = acorn.parse(this.jsCode, {ecmaVersion: 6, locations: false});
    });
    it('error message when path option is not specified', function () {
        try {
            espower(this.tree);
            assert.ok(false, 'Error should be thrown');
        } catch (e) {
            assert.equal(e.name, 'EspowerError');
            assert(e instanceof Error);
            assert(e instanceof EspowerError);
            assert.equal(e.message, '[espower] ECMAScript AST should contain location information.');
            assert(e.stack);
        }
    });
    it('error message when path option is specified', function () {
        try {
            espower(this.tree, {path: '/path/to/baz_test.js'});
            assert.ok(false, 'Error should be thrown');
        } catch (e) {
            assert.equal(e.name, 'EspowerError');
            assert(e instanceof Error);
            assert(e instanceof EspowerError);
            assert.equal(e.message, '[espower] ECMAScript AST should contain location information. path: /path/to/baz_test.js');
            assert(e.stack);
        }
    });
});


describe('AST prerequisites. Error should be thrown if AST is already instrumented.', function () {

    it('when going to instrument "assert(falsyStr);" twice', function () {
        var alreadyEspoweredCode = "assert(_rec1._expr(_rec1._capt(falsyStr,'arguments/0'),{content:'assert(falsyStr)',filepath:'/path/to/some_test.js',line:1}));";
        var ast = acorn.parse(alreadyEspoweredCode, {ecmaVersion: 6, locations: true});
        try {
            espower(ast, {path: '/path/to/baz_test.js'});
            assert.ok(false, 'Error should be thrown');
        } catch (e) {
            assert.equal(e.name, 'EspowerError');
            assert(e instanceof Error);
            assert(e instanceof EspowerError);
            assert.equal(e.message, '[espower] Attempted to transform AST twice. path: /path/to/baz_test.js');
            assert(e.stack);
        }
    });

    it('when going to instrument "browser.assert.element(foo);" twice', function () {
        var alreadyEspoweredCode = "browser.assert.element(_rec1._expr(_rec1._capt(foo,'arguments/0'),{content:'browser.assert.element(foo)',line:1}));";
        var ast = acorn.parse(alreadyEspoweredCode, {ecmaVersion: 6, locations: true});
        try {
            espower(ast, {
                path: '/path/to/foo_test.js',
                patterns: [
                    'browser.assert.element(selection, [message])'
                ]
            });
            assert.ok(false, 'Error should be thrown');
        } catch (e) {
            assert.equal(e.name, 'EspowerError');
            assert(e instanceof Error);
            assert(e instanceof EspowerError);
            assert.equal(e.message, '[espower] Attempted to transform AST twice. path: /path/to/foo_test.js');
            assert(e.stack);
        }
    });

});


describe('location information', function () {
    it('preserve location of instrumented nodes.', function () {
        var jsCode = 'assert((three * (seven * ten)) === three);';
        var tree = acorn.parse(jsCode, {ecmaVersion: 6, locations: true, ranges: true});
        var result = espower(tree, {path: '/path/to/baz_test.js'});
        estraverse.traverse(result, function (node) {
            if (typeof node.type === 'undefined') return;
            assert.ok(typeof node.loc !== 'undefined', 'type: ' + node.type);
            assert.ok(typeof node.range !== 'undefined', 'type: ' + node.type);
        });
    });
});


describe('lineSeparator', function () {
    var lineDetected = prelude(1) + "var falsyStr='';assert.ok(_rec1._expr(_rec1._capt(falsyStr,'arguments/0'),{content:'assert.ok(falsyStr)',line:3}));";
     function lineSeparatorTest (name, lineSeparatorInCode, options, expected) {
        it(name, function () {
            var sourceLines = [
                'var falsyStr = "";',
                '// comment line',
                'assert.ok(falsyStr);'
            ].join(lineSeparatorInCode);
            assert.equal(instrument(sourceLines, options), expected);
        });
    }
    context('code: LF', function () {
        function when (name, opt, expected) {
            lineSeparatorTest(name, '\n', opt, expected);
        }
        when('option: default', {}, lineDetected);
    });
    context('code: CR', function () {
        function when (name, opt, expected) {
            lineSeparatorTest(name, '\r', opt, expected);
        }
        when('option: default', {}, lineDetected);
    });
    context('code: CRLF', function () {
        function when (name, opt, expected) {
            lineSeparatorTest(name, '\r\n', opt, expected);
        }
        when('option: default', {}, lineDetected);
    });
});


describe('incoming SourceMap support', function () {

    function incomingSourceMapTest (testName, opts) {
        it(testName, function () {
            var originalCode = 'var str = "foo";\nvar anotherStr = "bar"\n\nassert.equal(\nstr,\nanotherStr\n);';

            var incomingCodeAndMap = escodegen.generate(acorn.parse(originalCode, {ecmaVersion: 6, locations: true, sourceFile: opts.filepath}), {
                format: {
                    compact: true
                },
                sourceMap: opts.filepath,
                sourceMapRoot: opts.sourceMapRoot,
                sourceContent: originalCode,
                sourceMapWithCode: true
            });

            var compactCode = incomingCodeAndMap.code;
            var incomingSourceMap = incomingCodeAndMap.map.toString();

            var intermediateFilepath = '/path/to/absolute/intermediate/transformed_test.js';
            var espoweredAST = espower(acorn.parse(compactCode, {ecmaVersion: 6, locations: true, sourceFile: intermediateFilepath}), {
                patterns: [
                    'assert.equal(actual, expected, [message])'
                ],
                sourceMap: incomingSourceMap,
                sourceRoot: opts.espowerSourceRoot
            });

            var espoweredCode = escodegen.generate(espoweredAST, {format: {compact: true}});

            var expectedOutput = prelude(2) + "var str='foo';var anotherStr='bar';assert.equal(_rec1._expr(_rec1._capt(str,'arguments/0'),{content:'assert.equal(str, anotherStr)',filepath:'" + opts.expectedPath + "',line:4}),_rec2._expr(_rec2._capt(anotherStr,'arguments/1'),{content:'assert.equal(str, anotherStr)',filepath:'" + opts.expectedPath + "',line:4}));";
            assert.equal(espoweredCode, expectedOutput);
        });
    }

    incomingSourceMapTest('filepath in sourceMap is absolute', {
        filepath: '/path/to/absolute/original_test.js',
        sourceMapRoot: null,
        espowerSourceRoot: null,
        expectedPath: 'original_test.js'
    });

    incomingSourceMapTest('filepath in sourceMap is relative', {
        filepath: 'relative/original_test.js',
        sourceMapRoot: null,
        espowerSourceRoot: null,
        expectedPath: 'relative/original_test.js'
    });

    incomingSourceMapTest('when sourceMap.sourceRoot is given and options.sourceRoot is not given', {
        filepath: 'test/original_test.js',
        sourceMapRoot: '/path/to/base',
        espowerSourceRoot: null,
        expectedPath: join('test', 'original_test.js').replace(/\\/g, '\\\\')
    });

    incomingSourceMapTest('when options.sourceRoot is given and sourceMap.sourceRoot is not given', {
        filepath: '/path/to/project/test/original_test.js',
        sourceMapRoot: null,
        espowerSourceRoot: '/path/to/project/',
        expectedPath: join('test', 'original_test.js').replace(/\\/g, '\\\\')
    });

    incomingSourceMapTest('when both options.sourceRoot and sourceMap.sourceRoot are given, options.sourceRoot has precedence over sourceMap.sourceRoot', {
        filepath: 'project/test/original_test.js',
        sourceMapRoot: '/path/to',
        espowerSourceRoot: '/path/to/project/',
        expectedPath: join('test', 'original_test.js').replace(/\\/g, '\\\\')
    });

    incomingSourceMapTest('when path in sourceMap is already relative, just use it even if sourceRoot exists', {
        filepath: 'already/relative/test.js',
        sourceMapRoot: null,
        espowerSourceRoot: '/path/to/project/test/already/relative',
        expectedPath: 'already/relative/test.js'
    });

    incomingSourceMapTest('broken sourceMap: when both sources and sourceRoot in SourceMap is absolute and conflicted, fallback to basename', {
        filepath: '/some/path/to/project/test/original_test.js',
        sourceMapRoot: '/another/path/to/project/',
        espowerSourceRoot: null,
        expectedPath: 'original_test.js'
    });

    incomingSourceMapTest('conflicted sourceRoot: when both sources and options.sourceRoot is absolute and conflicted, fallback to basename', {
        filepath: '/some/path/to/project/test/original_test.js',
        sourceMapRoot: null,
        espowerSourceRoot: '/another/path/to/project/',
        expectedPath: 'original_test.js'
    });

    incomingSourceMapTest('when filepath is relative and sourceMap.sourceRoot is locating source files on a server, try to create relative path', {
        filepath: 'test/original_test.js',
        sourceMapRoot: 'http://example.com/www/js/',
        espowerSourceRoot: null,
        expectedPath: join('test', 'original_test.js').replace(/\\/g, '\\\\')
    });

    incomingSourceMapTest('when filepath is absolute and sourceMap.sourceRoot is locating source files on a server, then fallback on basename', {
        filepath: '/path/to/absolute/original_test.js',
        sourceMapRoot: 'http://example.com/www/js/',
        espowerSourceRoot: null,
        expectedPath: 'original_test.js'
    });

    incomingSourceMapTest('when filepath is relative and sourceMap.sourceRoot is locating source files on a server, and options.sourceRoot is given, then try to create relative path', {
        filepath: 'test/original_test.js',
        sourceMapRoot: 'http://example.com/www/js/',
        espowerSourceRoot: '/path/to/project/',
        expectedPath: join('test', 'original_test.js').replace(/\\/g, '\\\\')
    });

    incomingSourceMapTest('when filepath is absolute and sourceMap.sourceRoot is locating source files on a server, and options.sourceRoot is given, then fallback on basename', {
        filepath: '/path/to/project/test/original_test.js',
        sourceMapRoot: 'http://example.com/www/js/',
        espowerSourceRoot: '/path/to/project/',
        expectedPath: 'original_test.js'
    });
});


describe('sourceRoot option', function () {
    function sourceRootTest (testName, config) {
        it(testName, function () {
            var jsCode = 'assert(falsyStr);';
            var jsAST = acorn.parse(jsCode, {ecmaVersion: 6, locations: true, sourceFile: config.incomingFilepath});
            var espoweredAST = espower(jsAST, {
                path: config.incomingFilepath,
                sourceRoot: config.espowerSourceRoot
            });
            var instrumentedCode = escodegen.generate(espoweredAST, {format: {compact: true}});
            assert.equal(instrumentedCode,
                         prelude(1) + "assert(_rec1._expr(_rec1._capt(falsyStr,'arguments/0'),{content:'assert(falsyStr)',filepath:'" + config.filepathInGeneratedCode + "',line:1}));");
        });
    }

    sourceRootTest('when sourceRoot ends with slash', {
        incomingFilepath: '/path/to/project/test/some_test.js',
        espowerSourceRoot: '/path/to/project/',
        filepathInGeneratedCode: join('test', 'some_test.js').replace(/\\/g, '\\\\')
    });

    sourceRootTest('when sourceRoot does not end with slash', {
        incomingFilepath: '/path/to/project/test/some_test.js',
        espowerSourceRoot: '/path/to/project',
        filepathInGeneratedCode: join('test', 'some_test.js').replace(/\\/g, '\\\\')
    });

    sourceRootTest('when path is already relative, just use it even if sourceRoot exists', {
        incomingFilepath: 'any/test/some_test.js',
        espowerSourceRoot: '/path/to/any/test',
        filepathInGeneratedCode: 'any/test/some_test.js'
    });

    sourceRootTest('when incoming absolute filepath conflicts with options.sourceRoot, fallback to basename', {
        incomingFilepath: '/some/path/to/project/test/original_test.js',
        espowerSourceRoot: '/another/path/to/project/',
        filepathInGeneratedCode: 'original_test.js'
    });
});
