(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['espower', 'acorn', 'acorn-es7-plugin', 'escodegen', 'assert'], factory);
    } else if (typeof exports === 'object') {
        factory(require('..'), require('acorn'), require('acorn-es7-plugin'), require('escodegen'), require('assert'));
    } else {
        factory(root.espower, root.acorn, root.acornEs7Plugin, root.escodegen, root.assert);
    }
}(this, function (
    espower,
    acorn,
    acornEs7Plugin,
    escodegen,
    assert
) {

acornEs7Plugin(acorn);

describe('instrumentation spec', function () {
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


    describe('NonTarget', function () {
        inst("assert.hoge(falsyStr);",
             "assert.hoge(falsyStr);");

        inst("hoge(falsyStr);",
             "hoge(falsyStr);");
    });


    describe('Literal', function () {
        inst("assert(false);",
             "assert(false);");

        inst("assert(0);",
             "assert(0);");

        inst("assert.equal(1, 0);",
             "assert.equal(1,0);");

        inst("assert(false, 'message');",
             "assert(false,'message');");

        inst("assert(false, messageStr);",
             "assert(false,messageStr);");

        inst("assert.equal(foo, 'bar', 'msg');",
             "assert.equal(assert._expr(assert._capt(foo,'arguments/0'),{content:'assert.equal(foo, \\'bar\\', \\'msg\\')',filepath:'path/to/some_test.js',line:1}),'bar','msg');");
    });


    describe('Identifier', function () {
        inst("assert(falsyStr);",
             "assert(assert._expr(assert._capt(falsyStr,'arguments/0'),{content:'assert(falsyStr)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(falsyStr, messageStr);",
             "assert(assert._expr(assert._capt(falsyStr,'arguments/0'),{content:'assert(falsyStr, messageStr)',filepath:'path/to/some_test.js',line:1}),messageStr);");

        inst("assert.equal(str, anotherStr);",
             "assert.equal(assert._expr(assert._capt(str,'arguments/0'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(anotherStr,'arguments/1'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.equal(\nstr,\nanotherStr\n);",
             "assert.equal(assert._expr(assert._capt(str,'arguments/0'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(anotherStr,'arguments/1'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.equal(str, anotherStr, messageStr);",
             "assert.equal(assert._expr(assert._capt(str,'arguments/0'),{content:'assert.equal(str, anotherStr, messageStr)',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(anotherStr,'arguments/1'),{content:'assert.equal(str, anotherStr, messageStr)',filepath:'path/to/some_test.js',line:1}),messageStr);");
    });


    describe('Identifier: multiline, multiassert', function () {
        inst("assert.equal(\nstr,\nanotherStr\n);\n\nassert.equal(\nstr,\nyetAnotherStr\n);",
             "assert.equal(assert._expr(assert._capt(str,'arguments/0'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(anotherStr,'arguments/1'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}));assert.equal(assert._expr(assert._capt(str,'arguments/0'),{content:'assert.equal(str, yetAnotherStr)',filepath:'path/to/some_test.js',line:6}),assert._expr(assert._capt(yetAnotherStr,'arguments/1'),{content:'assert.equal(str, yetAnotherStr)',filepath:'path/to/some_test.js',line:6}));");
    });


    describe('BinaryExpression', function () {
        inst("assert(4 !== 4);",
             "assert(assert._expr(assert._capt(4!==4,'arguments/0'),{content:'assert(4 !== 4)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(fuga !== 4);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'arguments/0/left')!==4,'arguments/0'),{content:'assert(fuga !== 4)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(fuga === piyo);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'arguments/0/left')===assert._capt(piyo,'arguments/0/right'),'arguments/0'),{content:'assert(fuga === piyo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(fuga\n ===\n piyo);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'arguments/0/left')===assert._capt(piyo,'arguments/0/right'),'arguments/0'),{content:'assert(fuga === piyo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(fuga   ===   piyo);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'arguments/0/left')===assert._capt(piyo,'arguments/0/right'),'arguments/0'),{content:'assert(fuga === piyo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(fuga !== piyo);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'arguments/0/left')!==assert._capt(piyo,'arguments/0/right'),'arguments/0'),{content:'assert(fuga !== piyo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.ok(hoge === fuga, 'comment');",
             "assert.ok(assert._expr(assert._capt(assert._capt(hoge,'arguments/0/left')===assert._capt(fuga,'arguments/0/right'),'arguments/0'),{content:'assert.ok(hoge === fuga, \\'comment\\')',filepath:'path/to/some_test.js',line:1}),'comment');");

        inst("assert(ary1.length === ary2.length);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(ary1,'arguments/0/left/object').length,'arguments/0/left')===assert._capt(assert._capt(ary2,'arguments/0/right/object').length,'arguments/0/right'),'arguments/0'),{content:'assert(ary1.length === ary2.length)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo instanceof Foo);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'arguments/0/left')instanceof assert._capt(Foo,'arguments/0/right'),'arguments/0'),{content:'assert(foo instanceof Foo)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('UnaryExpression', function () {
        inst("assert(!truth);",
             "assert(assert._expr(assert._capt(!assert._capt(truth,'arguments/0/argument'),'arguments/0'),{content:'assert(!truth)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(!!some);",
             "assert(assert._expr(assert._capt(!assert._capt(!assert._capt(some,'arguments/0/argument/argument'),'arguments/0/argument'),'arguments/0'),{content:'assert(!!some)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(!!foo.bar);",
             "assert(assert._expr(assert._capt(!assert._capt(!assert._capt(assert._capt(foo,'arguments/0/argument/argument/object').bar,'arguments/0/argument/argument'),'arguments/0/argument'),'arguments/0'),{content:'assert(!!foo.bar)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(delete foo.bar);",
             "assert(assert._expr(assert._capt(delete assert._capt(assert._capt(foo,'arguments/0/argument/object').bar,'arguments/0/argument'),'arguments/0'),{content:'assert(delete foo.bar)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(typeof foo !== 'undefined');",
             "assert(assert._expr(assert._capt(assert._capt(typeof foo,'arguments/0/left')!=='undefined','arguments/0'),{content:'assert(typeof foo !== \\'undefined\\')',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(typeof foo.bar !== 'undefined');",
             "assert(assert._expr(assert._capt(assert._capt(typeof assert._capt(assert._capt(foo,'arguments/0/left/argument/object').bar,'arguments/0/left/argument'),'arguments/0/left')!=='undefined','arguments/0'),{content:'assert(typeof foo.bar !== \\'undefined\\')',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.strictEqual(typeof foo, typeof bar);",
             "assert.strictEqual(assert._expr(assert._capt(typeof foo,'arguments/0'),{content:'assert.strictEqual(typeof foo, typeof bar)',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(typeof bar,'arguments/1'),{content:'assert.strictEqual(typeof foo, typeof bar)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('LogicalExpression', function () {
        inst("assert(5 < actual && actual < 13);",
             "assert(assert._expr(assert._capt(assert._capt(5<assert._capt(actual,'arguments/0/left/right'),'arguments/0/left')&&assert._capt(assert._capt(actual,'arguments/0/right/left')<13,'arguments/0/right'),'arguments/0'),{content:'assert(5 < actual && actual < 13)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.ok(actual < 5 || 13 < actual);",
             "assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(actual,'arguments/0/left/left')<5,'arguments/0/left')||assert._capt(13<assert._capt(actual,'arguments/0/right/right'),'arguments/0/right'),'arguments/0'),{content:'assert.ok(actual < 5 || 13 < actual)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(2 > actual && actual < 13);",
             "assert(assert._expr(assert._capt(assert._capt(2>assert._capt(actual,'arguments/0/left/right'),'arguments/0/left')&&assert._capt(assert._capt(actual,'arguments/0/right/left')<13,'arguments/0/right'),'arguments/0'),{content:'assert(2 > actual && actual < 13)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(2   >   actual    &&  actual     <  13);",
             "assert(assert._expr(assert._capt(assert._capt(2>assert._capt(actual,'arguments/0/left/right'),'arguments/0/left')&&assert._capt(assert._capt(actual,'arguments/0/right/left')<13,'arguments/0/right'),'arguments/0'),{content:'assert(2 > actual && actual < 13)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.equal(5 < actual && actual < 13, falsy);",
             "assert.equal(assert._expr(assert._capt(assert._capt(5<assert._capt(actual,'arguments/0/left/right'),'arguments/0/left')&&assert._capt(assert._capt(actual,'arguments/0/right/left')<13,'arguments/0/right'),'arguments/0'),{content:'assert.equal(5 < actual && actual < 13, falsy)',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(falsy,'arguments/1'),{content:'assert.equal(5 < actual && actual < 13, falsy)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('MemberExpression', function () {
        inst("assert(foo.bar);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'arguments/0/object').bar,'arguments/0'),{content:'assert(foo.bar)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo.bar.baz);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(foo,'arguments/0/object/object').bar,'arguments/0/object').baz,'arguments/0'),{content:'assert(foo.bar.baz)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo['bar']);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'arguments/0/object')['bar'],'arguments/0'),{content:'assert(foo[\\'bar\\'])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo[propName]);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'arguments/0/object')[assert._capt(propName,'arguments/0/property')],'arguments/0'),{content:'assert(foo[propName])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo  [  propName  ]  );",
             "assert(assert._expr(assert._capt(assert._capt(foo,'arguments/0/object')[assert._capt(propName,'arguments/0/property')],'arguments/0'),{content:'assert(foo[propName])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo[func(key)]);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'arguments/0/object')[assert._capt(func(assert._capt(key,'arguments/0/property/arguments/0')),'arguments/0/property')],'arguments/0'),{content:'assert(foo[func(key)])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo[propName]['key'][keys()['name']]);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(assert._capt(foo,'arguments/0/object/object/object')[assert._capt(propName,'arguments/0/object/object/property')],'arguments/0/object/object')['key'],'arguments/0/object')[assert._capt(assert._capt(keys(),'arguments/0/property/object')['name'],'arguments/0/property')],'arguments/0'),{content:'assert(foo[propName][\\'key\\'][keys()[\\'name\\']])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert( foo [  propName  ] [  'key' ]   [ keys  (  )  [   'name'  ] ]  );",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(assert._capt(foo,'arguments/0/object/object/object')[assert._capt(propName,'arguments/0/object/object/property')],'arguments/0/object/object')['key'],'arguments/0/object')[assert._capt(assert._capt(keys(),'arguments/0/property/object')['name'],'arguments/0/property')],'arguments/0'),{content:'assert(foo[propName][\\'key\\'][keys()[\\'name\\']])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.equal(ary1.length, ary2.length);",
             "assert.equal(assert._expr(assert._capt(assert._capt(ary1,'arguments/0/object').length,'arguments/0'),{content:'assert.equal(ary1.length, ary2.length)',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(assert._capt(ary2,'arguments/1/object').length,'arguments/1'),{content:'assert.equal(ary1.length, ary2.length)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.deepEqual(foo.propName, foo[key]);",
             "assert.deepEqual(assert._expr(assert._capt(assert._capt(foo,'arguments/0/object').propName,'arguments/0'),{content:'assert.deepEqual(foo.propName, foo[key])',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(assert._capt(foo,'arguments/1/object')[assert._capt(key,'arguments/1/property')],'arguments/1'),{content:'assert.deepEqual(foo.propName, foo[key])',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('CallExpression', function () {
        inst("assert(func());",
             "assert(assert._expr(assert._capt(func(),'arguments/0'),{content:'assert(func())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(obj.age());",
             "assert(assert._expr(assert._capt(assert._capt(obj,'arguments/0/callee/object').age(),'arguments/0'),{content:'assert(obj.age())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(isFalsy(positiveInt));",
             "assert(assert._expr(assert._capt(isFalsy(assert._capt(positiveInt,'arguments/0/arguments/0')),'arguments/0'),{content:'assert(isFalsy(positiveInt))',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo[propName]());",
             "assert(assert._expr(assert._capt(assert._capt(foo,'arguments/0/callee/object')[assert._capt(propName,'arguments/0/callee/property')](),'arguments/0'),{content:'assert(foo[propName]())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo[hoge[fuga[piyo]]]());",
             "assert(assert._expr(assert._capt(assert._capt(foo,'arguments/0/callee/object')[assert._capt(assert._capt(hoge,'arguments/0/callee/property/object')[assert._capt(assert._capt(fuga,'arguments/0/callee/property/property/object')[assert._capt(piyo,'arguments/0/callee/property/property/property')],'arguments/0/callee/property/property')],'arguments/0/callee/property')](),'arguments/0'),{content:'assert(foo[hoge[fuga[piyo]]]())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(sum(one, two, three) === seven);",
             "assert(assert._expr(assert._capt(assert._capt(sum(assert._capt(one,'arguments/0/left/arguments/0'),assert._capt(two,'arguments/0/left/arguments/1'),assert._capt(three,'arguments/0/left/arguments/2')),'arguments/0/left')===assert._capt(seven,'arguments/0/right'),'arguments/0'),{content:'assert(sum(one, two, three) === seven)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(sum(sum(one, two), three) === sum(sum(two, three), seven));",
             "assert(assert._expr(assert._capt(assert._capt(sum(assert._capt(sum(assert._capt(one,'arguments/0/left/arguments/0/arguments/0'),assert._capt(two,'arguments/0/left/arguments/0/arguments/1')),'arguments/0/left/arguments/0'),assert._capt(three,'arguments/0/left/arguments/1')),'arguments/0/left')===assert._capt(sum(assert._capt(sum(assert._capt(two,'arguments/0/right/arguments/0/arguments/0'),assert._capt(three,'arguments/0/right/arguments/0/arguments/1')),'arguments/0/right/arguments/0'),assert._capt(seven,'arguments/0/right/arguments/1')),'arguments/0/right'),'arguments/0'),{content:'assert(sum(sum(one, two), three) === sum(sum(two, three), seven))',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(math.calc.sum(one, two, three) === seven);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(assert._capt(math,'arguments/0/left/callee/object/object').calc,'arguments/0/left/callee/object').sum(assert._capt(one,'arguments/0/left/arguments/0'),assert._capt(two,'arguments/0/left/arguments/1'),assert._capt(three,'arguments/0/left/arguments/2')),'arguments/0/left')===assert._capt(seven,'arguments/0/right'),'arguments/0'),{content:'assert(math.calc.sum(one, two, three) === seven)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert((three * (seven * ten)) === three);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(three,'arguments/0/left/left')*assert._capt(assert._capt(seven,'arguments/0/left/right/left')*assert._capt(ten,'arguments/0/left/right/right'),'arguments/0/left/right'),'arguments/0/left')===assert._capt(three,'arguments/0/right'),'arguments/0'),{content:'assert(three * (seven * ten) === three)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(!concat(fuga, piyo));",
             "assert(assert._expr(assert._capt(!assert._capt(concat(assert._capt(fuga,'arguments/0/argument/arguments/0'),assert._capt(piyo,'arguments/0/argument/arguments/1')),'arguments/0/argument'),'arguments/0'),{content:'assert(!concat(fuga, piyo))',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.strictEqual((three * (seven * ten)), math.calc.sum(one, two, three));",
             "assert.strictEqual(assert._expr(assert._capt(assert._capt(three,'arguments/0/left')*assert._capt(assert._capt(seven,'arguments/0/right/left')*assert._capt(ten,'arguments/0/right/right'),'arguments/0/right'),'arguments/0'),{content:'assert.strictEqual(three * (seven * ten), math.calc.sum(one, two, three))',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(assert._capt(assert._capt(math,'arguments/1/callee/object/object').calc,'arguments/1/callee/object').sum(assert._capt(one,'arguments/1/arguments/0'),assert._capt(two,'arguments/1/arguments/1'),assert._capt(three,'arguments/1/arguments/2')),'arguments/1'),{content:'assert.strictEqual(three * (seven * ten), math.calc.sum(one, two, three))',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('AssignmentExpression', function () {
        inst("assert(counter += 1);",
             "assert(assert._expr(assert._capt(counter+=1,'arguments/0'),{content:'assert(counter += 1)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(dog.age += 1);",
             "assert(assert._expr(assert._capt(dog.age+=1,'arguments/0'),{content:'assert(dog.age += 1)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(dog.age    +=  1);",
             "assert(assert._expr(assert._capt(dog.age+=1,'arguments/0'),{content:'assert(dog.age += 1)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.strictEqual(dog.age += 1, three);",
             "assert.strictEqual(assert._expr(assert._capt(dog.age+=1,'arguments/0'),{content:'assert.strictEqual(dog.age += 1, three)',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(three,'arguments/1'),{content:'assert.strictEqual(dog.age += 1, three)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('ArrayExpression', function () {
        inst("assert([foo, bar]);",
             "assert(assert._expr(assert._capt([assert._capt(foo,'arguments/0/elements/0'),assert._capt(bar,'arguments/0/elements/1')],'arguments/0'),{content:'assert([foo,bar])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(typeof [[foo.bar, baz(moo)], + fourStr] === 'number');",
             "assert(assert._expr(assert._capt(assert._capt(typeof assert._capt([assert._capt([assert._capt(assert._capt(foo,'arguments/0/left/argument/elements/0/elements/0/object').bar,'arguments/0/left/argument/elements/0/elements/0'),assert._capt(baz(assert._capt(moo,'arguments/0/left/argument/elements/0/elements/1/arguments/0')),'arguments/0/left/argument/elements/0/elements/1')],'arguments/0/left/argument/elements/0'),assert._capt(+assert._capt(fourStr,'arguments/0/left/argument/elements/1/argument'),'arguments/0/left/argument/elements/1')],'arguments/0/left/argument'),'arguments/0/left')==='number','arguments/0'),{content:'assert(typeof [[foo.bar,baz(moo)],+fourStr] === \\'number\\')',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.notDeepEqual([foo, bar], [hoge, fuga, piyo]);",
             "assert.notDeepEqual(assert._expr(assert._capt([assert._capt(foo,'arguments/0/elements/0'),assert._capt(bar,'arguments/0/elements/1')],'arguments/0'),{content:'assert.notDeepEqual([foo,bar], [hoge,fuga,piyo])',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt([assert._capt(hoge,'arguments/1/elements/0'),assert._capt(fuga,'arguments/1/elements/1'),assert._capt(piyo,'arguments/1/elements/2')],'arguments/1'),{content:'assert.notDeepEqual([foo,bar], [hoge,fuga,piyo])',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('UpdateExpression', function () {
        inst("assert(++foo);",
             "assert(assert._expr(assert._capt(++foo,'arguments/0'),{content:'assert(++foo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(bar--);",
             "assert(assert._expr(assert._capt(bar--,'arguments/0'),{content:'assert(bar--)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.strictEqual(++foo, bar--);",
             "assert.strictEqual(assert._expr(assert._capt(++foo,'arguments/0'),{content:'assert.strictEqual(++foo, bar--)',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(bar--,'arguments/1'),{content:'assert.strictEqual(++foo, bar--)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('ConditionalExpression', function () {
        inst("assert(foo ? bar : baz);",
             "assert(assert._expr(assert._capt(foo,'arguments/0/test')?assert._capt(bar,'arguments/0/consequent'):assert._capt(baz,'arguments/0/alternate'),{content:'assert(foo ? bar : baz)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(falsy ? truthy : truthy ? anotherFalsy : truthy);",
             "assert(assert._expr(assert._capt(falsy,'arguments/0/test')?assert._capt(truthy,'arguments/0/consequent'):assert._capt(truthy,'arguments/0/alternate/test')?assert._capt(anotherFalsy,'arguments/0/alternate/consequent'):assert._capt(truthy,'arguments/0/alternate/alternate'),{content:'assert(falsy ? truthy : truthy ? anotherFalsy : truthy)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo() ? bar.baz : (typeof goo));",
             "assert(assert._expr(assert._capt(foo(),'arguments/0/test')?assert._capt(assert._capt(bar,'arguments/0/consequent/object').baz,'arguments/0/consequent'):assert._capt(typeof goo,'arguments/0/alternate'),{content:'assert(foo() ? bar.baz : typeof goo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.equal((foo ? bar : baz), (falsy ? truthy : truthy ? anotherFalsy : truthy));",
             "assert.equal(assert._expr(assert._capt(foo,'arguments/0/test')?assert._capt(bar,'arguments/0/consequent'):assert._capt(baz,'arguments/0/alternate'),{content:'assert.equal(foo ? bar : baz, falsy ? truthy : truthy ? anotherFalsy : truthy)',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(falsy,'arguments/1/test')?assert._capt(truthy,'arguments/1/consequent'):assert._capt(truthy,'arguments/1/alternate/test')?assert._capt(anotherFalsy,'arguments/1/alternate/consequent'):assert._capt(truthy,'arguments/1/alternate/alternate'),{content:'assert.equal(foo ? bar : baz, falsy ? truthy : truthy ? anotherFalsy : truthy)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('Literal: regular expression will not be instrumented', function () {
        inst("assert(/^not/.exec(str));",
             "assert(assert._expr(assert._capt(/^not/.exec(assert._capt(str,'arguments/0/arguments/0')),'arguments/0'),{content:'assert(/^not/.exec(str))',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('ObjectExpression', function () {
        inst("assert({foo: bar, hoge: fuga});",
             "assert(assert._expr(assert._capt({foo:assert._capt(bar,'arguments/0/properties/0/value'),hoge:assert._capt(fuga,'arguments/0/properties/1/value')},'arguments/0'),{content:'assert({foo: bar,hoge: fuga})',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(!({ foo: bar.baz, name: nameOf({firstName: first, lastName: last}) }));",
             "assert(assert._expr(assert._capt(!assert._capt({foo:assert._capt(assert._capt(bar,'arguments/0/argument/properties/0/value/object').baz,'arguments/0/argument/properties/0/value'),name:assert._capt(nameOf(assert._capt({firstName:assert._capt(first,'arguments/0/argument/properties/1/value/arguments/0/properties/0/value'),lastName:assert._capt(last,'arguments/0/argument/properties/1/value/arguments/0/properties/1/value')},'arguments/0/argument/properties/1/value/arguments/0')),'arguments/0/argument/properties/1/value')},'arguments/0/argument'),'arguments/0'),{content:'assert(!{foo: bar.baz,name: nameOf({firstName: first,lastName: last})})',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.deepEqual({foo: bar, hoge: fuga}, {hoge: fuga, foo: bar});",
             "assert.deepEqual(assert._expr(assert._capt({foo:assert._capt(bar,'arguments/0/properties/0/value'),hoge:assert._capt(fuga,'arguments/0/properties/1/value')},'arguments/0'),{content:'assert.deepEqual({foo: bar,hoge: fuga}, {hoge: fuga,foo: bar})',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt({hoge:assert._capt(fuga,'arguments/1/properties/0/value'),foo:assert._capt(bar,'arguments/1/properties/1/value')},'arguments/1'),{content:'assert.deepEqual({foo: bar,hoge: fuga}, {hoge: fuga,foo: bar})',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('NewExpression', function () {
        inst("assert(new Date());",
             "assert(assert._expr(assert._capt(new Date(),'arguments/0'),{content:'assert(new Date())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(new foo.bar.Baz());",
             "assert(assert._expr(assert._capt(new(assert._capt(assert._capt(foo,'arguments/0/callee/object/object').bar,'arguments/0/callee/object')).Baz(),'arguments/0'),{content:'assert(new foo.bar.Baz())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(!(new Array(foo, bar, baz)));",
             "assert(assert._expr(assert._capt(!assert._capt(new Array(assert._capt(foo,'arguments/0/argument/arguments/0'),assert._capt(bar,'arguments/0/argument/arguments/1'),assert._capt(baz,'arguments/0/argument/arguments/2')),'arguments/0/argument'),'arguments/0'),{content:'assert(!new Array(foo, bar, baz))',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.notEqual(new Date(), new Date('2013-01-12'));",
             "assert.notEqual(assert._expr(assert._capt(new Date(),'arguments/0'),{content:'assert.notEqual(new Date(), new Date(\\'2013-01-12\\'))',filepath:'path/to/some_test.js',line:1}),assert._expr(assert._capt(new Date('2013-01-12'),'arguments/1'),{content:'assert.notEqual(new Date(), new Date(\\'2013-01-12\\'))',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('FunctionExpression: body will not be instrumented', function () {
        inst("assert(function (a, b) { return a + b; });",
             "assert(function(a,b){return a+b;});");
        inst("assert(baz === (function (a, b) { return a + b; })(foo, bar));",
             "assert(assert._expr(assert._capt(assert._capt(baz,'arguments/0/left')===assert._capt(function(a,b){return a+b;}(assert._capt(foo,'arguments/0/right/arguments/0'),assert._capt(bar,'arguments/0/right/arguments/1')),'arguments/0/right'),'arguments/0'),{content:'assert(baz === function (a, b) {return a + b;}(foo, bar))',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('Literal: multibyte string literal', function () {
        inst("assert(fuga !== 'ふが');",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'arguments/0/left')!=='ふが','arguments/0'),{content:'assert(fuga !== \\'ふが\\')',filepath:'path/to/some_test.js',line:1}));");

        inst("assert('ほげ' !== 'ふが');",
             "assert(assert._expr(assert._capt('ほげ'!=='ふが','arguments/0'),{content:'assert(\\'ほげ\\' !== \\'ふが\\')',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('ES6', function () {

        describe('TemplateLiteral', function () {
            inst("assert(`Hello`);",
                 "assert(assert._expr(assert._capt(`Hello`,'arguments/0'),{content:'assert(`Hello`)',filepath:'path/to/some_test.js',line:1}));");
            inst("assert(`Hello, ${nickname}`);",
                 "assert(assert._expr(assert._capt(`Hello, ${assert._capt(nickname,'arguments/0/expressions/0')}`,'arguments/0'),{content:'assert(`Hello, ${ nickname }`)',filepath:'path/to/some_test.js',line:1}));");
            inst("assert(`Hello, ${user.nickname}`);",
                 "assert(assert._expr(assert._capt(`Hello, ${assert._capt(assert._capt(user,'arguments/0/expressions/0/object').nickname,'arguments/0/expressions/0')}`,'arguments/0'),{content:'assert(`Hello, ${ user.nickname }`)',filepath:'path/to/some_test.js',line:1}));");
        });

        describe('TaggedTemplateExpression', function () {
            inst("assert(fn`a${1}`);",
                 "assert(assert._expr(assert._capt(fn`a${1}`,'arguments/0'),{content:'assert(fn`a${ 1 }`)',filepath:'path/to/some_test.js',line:1}));");
            inst("assert(fn`a${foo}b${bar}c${baz}`);",
                 "assert(assert._expr(assert._capt(fn`a${assert._capt(foo,'arguments/0/quasi/expressions/0')}b${assert._capt(bar,'arguments/0/quasi/expressions/1')}c${assert._capt(baz,'arguments/0/quasi/expressions/2')}`,'arguments/0'),{content:'assert(fn`a${ foo }b${ bar }c${ baz }`)',filepath:'path/to/some_test.js',line:1}));");
            inst("assert(fn`driver ${bob.name}, navigator ${alice.getName()}`);",
                 "assert(assert._expr(assert._capt(fn`driver ${assert._capt(assert._capt(bob,'arguments/0/quasi/expressions/0/object').name,'arguments/0/quasi/expressions/0')}, navigator ${assert._capt(assert._capt(alice,'arguments/0/quasi/expressions/1/callee/object').getName(),'arguments/0/quasi/expressions/1')}`,'arguments/0'),{content:'assert(fn`driver ${ bob.name }, navigator ${ alice.getName() }`)',filepath:'path/to/some_test.js',line:1}));");
        });

        describe('ArrowFunctionExpression: body will not be instrumented', function () {
            inst("assert(v => v + 1);",
                 "assert(v=>v+1);");
            inst("assert((v, i) => v + i);",
                 "assert((v,i)=>v+i);");
            inst("assert(v => ({even: v, odd: v + 1}));",
                 "assert(v=>({even:v,odd:v+1}));");
            inst("assert(seven === ((v, i) => v + i)(four, five));",
                 "assert(assert._expr(assert._capt(assert._capt(seven,'arguments/0/left')===assert._capt(((v,i)=>v+i)(assert._capt(four,'arguments/0/right/arguments/0'),assert._capt(five,'arguments/0/right/arguments/1')),'arguments/0/right'),'arguments/0'),{content:'assert(seven === ((v, i) => v + i)(four, five))',filepath:'path/to/some_test.js',line:1}));");
        });

        describe('ClassExpression: body will not be instrumented', function () {
            inst("assert(class Me { getClassName() { return foo + Me.name; } });",
                 "assert(class Me{getClassName(){return foo+Me.name;}});");
        });

        describe('AssignmentExpression: left hand side of Destructuring will not be instrumented', function () {
            inst("assert([x] = [3]);",
                 "assert(assert._expr(assert._capt([x]=assert._capt([3],'arguments/0/right'),'arguments/0'),{content:'assert([x] = [3])',filepath:'path/to/some_test.js',line:1}));");
            inst("assert([x] = [foo]);",
                 "assert(assert._expr(assert._capt([x]=assert._capt([assert._capt(foo,'arguments/0/right/elements/0')],'arguments/0/right'),'arguments/0'),{content:'assert([x] = [foo])',filepath:'path/to/some_test.js',line:1}));");
        });

        describe('Literal: Binary and Octal Literals', function () {
            inst("assert(0b111110111);",
                 "assert(503);");
            inst("assert(0o767);",
                 "assert(503);");
        });

        describe('SpreadElement', function () {
            inst("assert(hello(...names));",
                 "assert(assert._expr(assert._capt(hello(...assert._capt(names,'arguments/0/arguments/0/argument')),'arguments/0'),{content:'assert(hello(...names))',filepath:'path/to/some_test.js',line:1}));");
            inst("assert([head, ...tail].length);",
                 "assert(assert._expr(assert._capt(assert._capt([assert._capt(head,'arguments/0/object/elements/0'),...assert._capt(tail,'arguments/0/object/elements/1/argument')],'arguments/0/object').length,'arguments/0'),{content:'assert([head,...tail].length)',filepath:'path/to/some_test.js',line:1}));");
            inst("assert(f(head, ...iter(), ...[foo, bar]));",
                 "assert(assert._expr(assert._capt(f(assert._capt(head,'arguments/0/arguments/0'),...assert._capt(iter(),'arguments/0/arguments/1/argument'),...assert._capt([assert._capt(foo,'arguments/0/arguments/2/argument/elements/0'),assert._capt(bar,'arguments/0/arguments/2/argument/elements/1')],'arguments/0/arguments/2/argument')),'arguments/0'),{content:'assert(f(head, ...iter(), ...[foo,bar]))',filepath:'path/to/some_test.js',line:1}));");
        });

        describe('YieldExpression', function () {
            inst("function *gen() {assert((yield bigOrSmall(size)) === 'big')}",
                 "function*gen(){assert(assert._expr(assert._capt(assert._capt(yield bigOrSmall(assert._capt(size,'arguments/0/left/argument/arguments/0')),'arguments/0/left')==='big','arguments/0'),{content:'assert((yield bigOrSmall(size)) === \\'big\\')',filepath:'path/to/some_test.js',generator:true,line:1}));}");
        });

        describe('YieldExpression vs FunctionCall disambiguation', function () {
            inst("function baz() {assert((yield (foo)) === bar)}",
                 "function baz(){assert(assert._expr(assert._capt(assert._capt(yield(assert._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===assert._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(yield(foo) === bar)',filepath:'path/to/some_test.js',line:1}));}");

            inst("function *baz() {assert((yield (foo)) === bar)}",
                 "function*baz(){assert(assert._expr(assert._capt(assert._capt(yield foo,'arguments/0/left')===assert._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((yield foo) === bar)',filepath:'path/to/some_test.js',generator:true,line:1}));}");

            inst("var baz = function () {assert((yield (foo)) === bar)}",
                 "var baz=function(){assert(assert._expr(assert._capt(assert._capt(yield(assert._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===assert._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(yield(foo) === bar)',filepath:'path/to/some_test.js',line:1}));};");

            inst("var baz = function *() {assert((yield (foo)) === bar)}",
                 "var baz=function*(){assert(assert._expr(assert._capt(assert._capt(yield foo,'arguments/0/left')===assert._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((yield foo) === bar)',filepath:'path/to/some_test.js',generator:true,line:1}));};");
        });

        describe('AwaitExpression', function () {
            inst("async function gen() {assert((await bigOrSmall(size)) === 'big')}",
                 "async function gen(){assert(assert._expr(assert._capt(assert._capt(await bigOrSmall(assert._capt(size,'arguments/0/left/argument/arguments/0')),'arguments/0/left')==='big','arguments/0'),{async:true,content:'assert((await bigOrSmall(size)) === \\'big\\')',filepath:'path/to/some_test.js',line:1}));}");
        });

        describe('AwaitExpression vs FunctionCall disambiguation', function () {
            inst("function baz() {assert((await (foo)) === bar)}",
                 "function baz(){assert(assert._expr(assert._capt(assert._capt(await(assert._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===assert._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(await(foo) === bar)',filepath:'path/to/some_test.js',line:1}));}");

            inst("async function baz() {assert((await (foo)) === bar)}",
                 "async function baz(){assert(assert._expr(assert._capt(assert._capt(await foo,'arguments/0/left')===assert._capt(bar,'arguments/0/right'),'arguments/0'),{async:true,content:'assert((await foo) === bar)',filepath:'path/to/some_test.js',line:1}));}");

            inst("var baz = function () {assert((await (foo)) === bar)}",
                 "var baz=function(){assert(assert._expr(assert._capt(assert._capt(await(assert._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===assert._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(await(foo) === bar)',filepath:'path/to/some_test.js',line:1}));};");

            inst("var baz = async function () {assert((await (foo)) === bar)}",
                 "var baz=async function(){assert(assert._expr(assert._capt(assert._capt(await foo,'arguments/0/left')===assert._capt(bar,'arguments/0/right'),'arguments/0'),{async:true,content:'assert((await foo) === bar)',filepath:'path/to/some_test.js',line:1}));};");

            inst("var baz = () => {assert((await (foo)) === bar)};",
                 "var baz=()=>{assert(assert._expr(assert._capt(assert._capt(await(assert._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===assert._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(await(foo) === bar)',filepath:'path/to/some_test.js',line:1}));};");

            inst("var baz = async () => {assert((await (foo)) === bar)}",
                 "var baz=async()=>{assert(assert._expr(assert._capt(assert._capt(await foo,'arguments/0/left')===assert._capt(bar,'arguments/0/right'),'arguments/0'),{async:true,content:'assert((await foo) === bar)',filepath:'path/to/some_test.js',line:1}));};");
        });

        describe('Enhanced Object Literals', function () {

            describe('Property: Computed (dynamic) property names', function () {
                inst("assert({[num]: foo});",
                     "assert(assert._expr(assert._capt({[assert._capt(num,'arguments/0/properties/0/key')]:assert._capt(foo,'arguments/0/properties/0/value')},'arguments/0'),{content:'assert({ [num]: foo })',filepath:'path/to/some_test.js',line:1}));");

                inst("assert({[ 'prop_' + (() => bar())() ]: 42});",
                     "assert(assert._expr(assert._capt({[assert._capt('prop_'+assert._capt((()=>bar())(),'arguments/0/properties/0/key/right'),'arguments/0/properties/0/key')]:42},'arguments/0'),{content:'assert({ [\\'prop_\\' + (() => bar())()]: 42 })',filepath:'path/to/some_test.js',line:1}));");

                inst("assert({[`prop_${generate(seed)}`]: foo});",
                     "assert(assert._expr(assert._capt({[assert._capt(`prop_${assert._capt(generate(assert._capt(seed,'arguments/0/properties/0/key/expressions/0/arguments/0')),'arguments/0/properties/0/key/expressions/0')}`,'arguments/0/properties/0/key')]:assert._capt(foo,'arguments/0/properties/0/value')},'arguments/0'),{content:'assert({ [`prop_${ generate(seed) }`]: foo })',filepath:'path/to/some_test.js',line:1}));");
            });

            describe('Property: shorthand literal itself will not be instrumented', function () {
                inst("assert({foo});",
                     "assert(assert._expr(assert._capt({foo},'arguments/0'),{content:'assert({ foo })',filepath:'path/to/some_test.js',line:1}));");

                inst("assert({foo, bar: baz});",
                     "assert(assert._expr(assert._capt({foo,bar:assert._capt(baz,'arguments/0/properties/1/value')},'arguments/0'),{content:'assert({foo,bar: baz})',filepath:'path/to/some_test.js',line:1}));");
            });
        });
    });

});

}));
