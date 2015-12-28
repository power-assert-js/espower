var EspowerLocationDetector = require('../lib/espower-location-detector');
var assert = require('assert');
var acorn = require('acorn');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var escallmatch = require('escallmatch');


describe('EspowerLocationDetector: incoming SourceMap support', function () {

    function incomingSourceMapTest (testName, opts) {
        it(testName, function () {
            var originalCode = [
                'var str = "foo";',
                'var anotherStr = "bar";',
                '',
                'assert.equal(',
                '    str,',
                '    anotherStr',
                ');'
            ].join('\n');
            var incomingAst = acorn.parse(originalCode, {ecmaVersion: 6, locations: true, sourceFile: opts.filepath});
            // console.log(JSON.stringify(incomingAst, null, 2));
            var incomingCodeAndMap = escodegen.generate(incomingAst, {
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
            var afterAst = acorn.parse(compactCode, {ecmaVersion: 6, locations: true, sourceFile: intermediateFilepath});

            var matcher = escallmatch('assert.equal(actual, expected, [message])');
            var callexp;
            estraverse.traverse(afterAst, {
                enter: function (currentNode) {
                    if (matcher.test(currentNode)) {
                        callexp = currentNode;
                        return this.break();
                    }
                    return undefined;
                }
            });

            var detector = new EspowerLocationDetector({
                path: opts.filepath,
                sourceRoot: opts.espowerSourceRoot,
                sourceMap: incomingSourceMap
            });
            var result = detector.locationFor(callexp);
            assert.deepEqual(result, {
                source: opts.expectedPath,
                line: 4,
                column: 0
            });
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
        expectedPath: 'test/original_test.js'
    });

    incomingSourceMapTest('when options.sourceRoot is given and sourceMap.sourceRoot is not given', {
        filepath: '/path/to/project/test/original_test.js',
        sourceMapRoot: null,
        espowerSourceRoot: '/path/to/project/',
        expectedPath: 'test/original_test.js'
    });

    incomingSourceMapTest('when both options.sourceRoot and sourceMap.sourceRoot are given, options.sourceRoot has precedence over sourceMap.sourceRoot', {
        filepath: 'project/test/original_test.js',
        sourceMapRoot: '/path/to',
        espowerSourceRoot: '/path/to/project/',
        expectedPath: 'test/original_test.js'
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
        expectedPath: 'test/original_test.js'
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
        expectedPath: 'test/original_test.js'
    });

    incomingSourceMapTest('when filepath is absolute and sourceMap.sourceRoot is locating source files on a server, and options.sourceRoot is given, then fallback on basename', {
        filepath: '/path/to/project/test/original_test.js',
        sourceMapRoot: 'http://example.com/www/js/',
        espowerSourceRoot: '/path/to/project/',
        expectedPath: 'original_test.js'
    });
});


describe('sourceRoot option', function () {

    function sourceRootTest (testName, opts) {
        it(testName, function () {
            var jsCode = 'assert(falsyStr);';
            var jsAST = acorn.parse(jsCode, {ecmaVersion: 6, locations: true, sourceFile: opts.incomingFilepath});

            var matcher = escallmatch('assert(value, [message])');
            var callexp;
            estraverse.traverse(jsAST, {
                enter: function (currentNode) {
                    if (matcher.test(currentNode)) {
                        callexp = currentNode;
                        return this.break();
                    }
                    return undefined;
                }
            });

            var detector = new EspowerLocationDetector({
                path: opts.incomingFilepath,
                sourceRoot: opts.espowerSourceRoot
            });
            var result = detector.locationFor(callexp);
            assert.deepEqual(result, {
                source: opts.filepathInGeneratedCode,
                line: 1,
                column: 0
            });
        });
    }

    sourceRootTest('when sourceRoot ends with slash', {
        incomingFilepath: '/path/to/project/test/some_test.js',
        espowerSourceRoot: '/path/to/project/',
        filepathInGeneratedCode: 'test/some_test.js'
    });

    sourceRootTest('when sourceRoot does not end with slash', {
        incomingFilepath: '/path/to/project/test/some_test.js',
        espowerSourceRoot: '/path/to/project',
        filepathInGeneratedCode: 'test/some_test.js'
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

