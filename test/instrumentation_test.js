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
             "assert.equal(_rec1._expr(_rec1._capt(foo,'arguments/0'),{content:'assert.equal(foo, \\'bar\\', \\'msg\\')',filepath:'path/to/some_test.js',line:1}),'bar','msg');");
    });


    describe('Identifier', function () {
        inst("assert(falsyStr);",
             "assert(_rec1._expr(_rec1._capt(falsyStr,'arguments/0'),{content:'assert(falsyStr)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(falsyStr, messageStr);",
             "assert(_rec1._expr(_rec1._capt(falsyStr,'arguments/0'),{content:'assert(falsyStr, messageStr)',filepath:'path/to/some_test.js',line:1}),messageStr);");

        inst("assert.equal(str, anotherStr);",
             "assert.equal(_rec1._expr(_rec1._capt(str,'arguments/0'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(anotherStr,'arguments/1'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.equal(\nstr,\nanotherStr\n);",
             "assert.equal(_rec1._expr(_rec1._capt(str,'arguments/0'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(anotherStr,'arguments/1'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.equal(str, anotherStr, messageStr);",
             "assert.equal(_rec1._expr(_rec1._capt(str,'arguments/0'),{content:'assert.equal(str, anotherStr, messageStr)',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(anotherStr,'arguments/1'),{content:'assert.equal(str, anotherStr, messageStr)',filepath:'path/to/some_test.js',line:1}),messageStr);");
    });


    describe('Identifier: multiline, multiassert', function () {
        inst("assert.equal(\nstr,\nanotherStr\n);\n\nassert.equal(\nstr,\nyetAnotherStr\n);",
             "assert.equal(_rec1._expr(_rec1._capt(str,'arguments/0'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(anotherStr,'arguments/1'),{content:'assert.equal(str, anotherStr)',filepath:'path/to/some_test.js',line:1}));assert.equal(_rec3._expr(_rec3._capt(str,'arguments/0'),{content:'assert.equal(str, yetAnotherStr)',filepath:'path/to/some_test.js',line:6}),_rec4._expr(_rec4._capt(yetAnotherStr,'arguments/1'),{content:'assert.equal(str, yetAnotherStr)',filepath:'path/to/some_test.js',line:6}));");
    });


    describe('BinaryExpression', function () {
        inst("assert(4 !== 4);",
             "assert(_rec1._expr(_rec1._capt(4!==4,'arguments/0'),{content:'assert(4 !== 4)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(fuga !== 4);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(fuga,'arguments/0/left')!==4,'arguments/0'),{content:'assert(fuga !== 4)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(fuga === piyo);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(fuga,'arguments/0/left')===_rec1._capt(piyo,'arguments/0/right'),'arguments/0'),{content:'assert(fuga === piyo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(fuga\n ===\n piyo);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(fuga,'arguments/0/left')===_rec1._capt(piyo,'arguments/0/right'),'arguments/0'),{content:'assert(fuga === piyo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(fuga   ===   piyo);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(fuga,'arguments/0/left')===_rec1._capt(piyo,'arguments/0/right'),'arguments/0'),{content:'assert(fuga === piyo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(fuga !== piyo);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(fuga,'arguments/0/left')!==_rec1._capt(piyo,'arguments/0/right'),'arguments/0'),{content:'assert(fuga !== piyo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.ok(hoge === fuga, 'comment');",
             "assert.ok(_rec1._expr(_rec1._capt(_rec1._capt(hoge,'arguments/0/left')===_rec1._capt(fuga,'arguments/0/right'),'arguments/0'),{content:'assert.ok(hoge === fuga, \\'comment\\')',filepath:'path/to/some_test.js',line:1}),'comment');");

        inst("assert(ary1.length === ary2.length);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(_rec1._capt(ary1,'arguments/0/left/object').length,'arguments/0/left')===_rec1._capt(_rec1._capt(ary2,'arguments/0/right/object').length,'arguments/0/right'),'arguments/0'),{content:'assert(ary1.length === ary2.length)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo instanceof Foo);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(foo,'arguments/0/left')instanceof _rec1._capt(Foo,'arguments/0/right'),'arguments/0'),{content:'assert(foo instanceof Foo)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('UnaryExpression', function () {
        inst("assert(!truth);",
             "assert(_rec1._expr(_rec1._capt(!_rec1._capt(truth,'arguments/0/argument'),'arguments/0'),{content:'assert(!truth)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(!!some);",
             "assert(_rec1._expr(_rec1._capt(!_rec1._capt(!_rec1._capt(some,'arguments/0/argument/argument'),'arguments/0/argument'),'arguments/0'),{content:'assert(!!some)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(!!foo.bar);",
             "assert(_rec1._expr(_rec1._capt(!_rec1._capt(!_rec1._capt(_rec1._capt(foo,'arguments/0/argument/argument/object').bar,'arguments/0/argument/argument'),'arguments/0/argument'),'arguments/0'),{content:'assert(!!foo.bar)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(delete foo.bar);",
             "assert(_rec1._expr(_rec1._capt(delete _rec1._capt(_rec1._capt(foo,'arguments/0/argument/object').bar,'arguments/0/argument'),'arguments/0'),{content:'assert(delete foo.bar)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(typeof foo !== 'undefined');",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(typeof foo,'arguments/0/left')!=='undefined','arguments/0'),{content:'assert(typeof foo !== \\'undefined\\')',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(typeof foo.bar !== 'undefined');",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(typeof _rec1._capt(_rec1._capt(foo,'arguments/0/left/argument/object').bar,'arguments/0/left/argument'),'arguments/0/left')!=='undefined','arguments/0'),{content:'assert(typeof foo.bar !== \\'undefined\\')',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.strictEqual(typeof foo, typeof bar);",
             "assert.strictEqual(_rec1._expr(_rec1._capt(typeof foo,'arguments/0'),{content:'assert.strictEqual(typeof foo, typeof bar)',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(typeof bar,'arguments/1'),{content:'assert.strictEqual(typeof foo, typeof bar)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('LogicalExpression', function () {
        inst("assert(5 < actual && actual < 13);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(5<_rec1._capt(actual,'arguments/0/left/right'),'arguments/0/left')&&_rec1._capt(_rec1._capt(actual,'arguments/0/right/left')<13,'arguments/0/right'),'arguments/0'),{content:'assert(5 < actual && actual < 13)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.ok(actual < 5 || 13 < actual);",
             "assert.ok(_rec1._expr(_rec1._capt(_rec1._capt(_rec1._capt(actual,'arguments/0/left/left')<5,'arguments/0/left')||_rec1._capt(13<_rec1._capt(actual,'arguments/0/right/right'),'arguments/0/right'),'arguments/0'),{content:'assert.ok(actual < 5 || 13 < actual)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(2 > actual && actual < 13);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(2>_rec1._capt(actual,'arguments/0/left/right'),'arguments/0/left')&&_rec1._capt(_rec1._capt(actual,'arguments/0/right/left')<13,'arguments/0/right'),'arguments/0'),{content:'assert(2 > actual && actual < 13)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(2   >   actual    &&  actual     <  13);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(2>_rec1._capt(actual,'arguments/0/left/right'),'arguments/0/left')&&_rec1._capt(_rec1._capt(actual,'arguments/0/right/left')<13,'arguments/0/right'),'arguments/0'),{content:'assert(2 > actual && actual < 13)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.equal(5 < actual && actual < 13, falsy);",
             "assert.equal(_rec1._expr(_rec1._capt(_rec1._capt(5<_rec1._capt(actual,'arguments/0/left/right'),'arguments/0/left')&&_rec1._capt(_rec1._capt(actual,'arguments/0/right/left')<13,'arguments/0/right'),'arguments/0'),{content:'assert.equal(5 < actual && actual < 13, falsy)',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(falsy,'arguments/1'),{content:'assert.equal(5 < actual && actual < 13, falsy)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('MemberExpression', function () {
        inst("assert(foo.bar);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(foo,'arguments/0/object').bar,'arguments/0'),{content:'assert(foo.bar)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo.bar.baz);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(_rec1._capt(foo,'arguments/0/object/object').bar,'arguments/0/object').baz,'arguments/0'),{content:'assert(foo.bar.baz)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo['bar']);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(foo,'arguments/0/object')['bar'],'arguments/0'),{content:'assert(foo[\\'bar\\'])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo[propName]);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(foo,'arguments/0/object')[_rec1._capt(propName,'arguments/0/property')],'arguments/0'),{content:'assert(foo[propName])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo  [  propName  ]  );",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(foo,'arguments/0/object')[_rec1._capt(propName,'arguments/0/property')],'arguments/0'),{content:'assert(foo[propName])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo[func(key)]);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(foo,'arguments/0/object')[_rec1._capt(func(_rec1._capt(key,'arguments/0/property/arguments/0')),'arguments/0/property')],'arguments/0'),{content:'assert(foo[func(key)])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo[propName]['key'][keys()['name']]);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(_rec1._capt(_rec1._capt(foo,'arguments/0/object/object/object')[_rec1._capt(propName,'arguments/0/object/object/property')],'arguments/0/object/object')['key'],'arguments/0/object')[_rec1._capt(_rec1._capt(keys(),'arguments/0/property/object')['name'],'arguments/0/property')],'arguments/0'),{content:'assert(foo[propName][\\'key\\'][keys()[\\'name\\']])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert( foo [  propName  ] [  'key' ]   [ keys  (  )  [   'name'  ] ]  );",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(_rec1._capt(_rec1._capt(foo,'arguments/0/object/object/object')[_rec1._capt(propName,'arguments/0/object/object/property')],'arguments/0/object/object')['key'],'arguments/0/object')[_rec1._capt(_rec1._capt(keys(),'arguments/0/property/object')['name'],'arguments/0/property')],'arguments/0'),{content:'assert(foo[propName][\\'key\\'][keys()[\\'name\\']])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.equal(ary1.length, ary2.length);",
             "assert.equal(_rec1._expr(_rec1._capt(_rec1._capt(ary1,'arguments/0/object').length,'arguments/0'),{content:'assert.equal(ary1.length, ary2.length)',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(_rec2._capt(ary2,'arguments/1/object').length,'arguments/1'),{content:'assert.equal(ary1.length, ary2.length)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.deepEqual(foo.propName, foo[key]);",
             "assert.deepEqual(_rec1._expr(_rec1._capt(_rec1._capt(foo,'arguments/0/object').propName,'arguments/0'),{content:'assert.deepEqual(foo.propName, foo[key])',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(_rec2._capt(foo,'arguments/1/object')[_rec2._capt(key,'arguments/1/property')],'arguments/1'),{content:'assert.deepEqual(foo.propName, foo[key])',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('CallExpression', function () {
        inst("assert(func());",
             "assert(_rec1._expr(_rec1._capt(func(),'arguments/0'),{content:'assert(func())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(obj.age());",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(obj,'arguments/0/callee/object').age(),'arguments/0'),{content:'assert(obj.age())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(isFalsy(positiveInt));",
             "assert(_rec1._expr(_rec1._capt(isFalsy(_rec1._capt(positiveInt,'arguments/0/arguments/0')),'arguments/0'),{content:'assert(isFalsy(positiveInt))',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo[propName]());",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(foo,'arguments/0/callee/object')[_rec1._capt(propName,'arguments/0/callee/property')](),'arguments/0'),{content:'assert(foo[propName]())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo[hoge[fuga[piyo]]]());",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(foo,'arguments/0/callee/object')[_rec1._capt(_rec1._capt(hoge,'arguments/0/callee/property/object')[_rec1._capt(_rec1._capt(fuga,'arguments/0/callee/property/property/object')[_rec1._capt(piyo,'arguments/0/callee/property/property/property')],'arguments/0/callee/property/property')],'arguments/0/callee/property')](),'arguments/0'),{content:'assert(foo[hoge[fuga[piyo]]]())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(sum(one, two, three) === seven);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(sum(_rec1._capt(one,'arguments/0/left/arguments/0'),_rec1._capt(two,'arguments/0/left/arguments/1'),_rec1._capt(three,'arguments/0/left/arguments/2')),'arguments/0/left')===_rec1._capt(seven,'arguments/0/right'),'arguments/0'),{content:'assert(sum(one, two, three) === seven)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(sum(sum(one, two), three) === sum(sum(two, three), seven));",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(sum(_rec1._capt(sum(_rec1._capt(one,'arguments/0/left/arguments/0/arguments/0'),_rec1._capt(two,'arguments/0/left/arguments/0/arguments/1')),'arguments/0/left/arguments/0'),_rec1._capt(three,'arguments/0/left/arguments/1')),'arguments/0/left')===_rec1._capt(sum(_rec1._capt(sum(_rec1._capt(two,'arguments/0/right/arguments/0/arguments/0'),_rec1._capt(three,'arguments/0/right/arguments/0/arguments/1')),'arguments/0/right/arguments/0'),_rec1._capt(seven,'arguments/0/right/arguments/1')),'arguments/0/right'),'arguments/0'),{content:'assert(sum(sum(one, two), three) === sum(sum(two, three), seven))',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(math.calc.sum(one, two, three) === seven);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(_rec1._capt(_rec1._capt(math,'arguments/0/left/callee/object/object').calc,'arguments/0/left/callee/object').sum(_rec1._capt(one,'arguments/0/left/arguments/0'),_rec1._capt(two,'arguments/0/left/arguments/1'),_rec1._capt(three,'arguments/0/left/arguments/2')),'arguments/0/left')===_rec1._capt(seven,'arguments/0/right'),'arguments/0'),{content:'assert(math.calc.sum(one, two, three) === seven)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert((three * (seven * ten)) === three);",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(_rec1._capt(three,'arguments/0/left/left')*_rec1._capt(_rec1._capt(seven,'arguments/0/left/right/left')*_rec1._capt(ten,'arguments/0/left/right/right'),'arguments/0/left/right'),'arguments/0/left')===_rec1._capt(three,'arguments/0/right'),'arguments/0'),{content:'assert(three * (seven * ten) === three)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(!concat(fuga, piyo));",
             "assert(_rec1._expr(_rec1._capt(!_rec1._capt(concat(_rec1._capt(fuga,'arguments/0/argument/arguments/0'),_rec1._capt(piyo,'arguments/0/argument/arguments/1')),'arguments/0/argument'),'arguments/0'),{content:'assert(!concat(fuga, piyo))',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.strictEqual((three * (seven * ten)), math.calc.sum(one, two, three));",
             "assert.strictEqual(_rec1._expr(_rec1._capt(_rec1._capt(three,'arguments/0/left')*_rec1._capt(_rec1._capt(seven,'arguments/0/right/left')*_rec1._capt(ten,'arguments/0/right/right'),'arguments/0/right'),'arguments/0'),{content:'assert.strictEqual(three * (seven * ten), math.calc.sum(one, two, three))',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(_rec2._capt(_rec2._capt(math,'arguments/1/callee/object/object').calc,'arguments/1/callee/object').sum(_rec2._capt(one,'arguments/1/arguments/0'),_rec2._capt(two,'arguments/1/arguments/1'),_rec2._capt(three,'arguments/1/arguments/2')),'arguments/1'),{content:'assert.strictEqual(three * (seven * ten), math.calc.sum(one, two, three))',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('AssignmentExpression', function () {
        inst("assert(counter += 1);",
             "assert(_rec1._expr(_rec1._capt(counter+=1,'arguments/0'),{content:'assert(counter += 1)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(dog.age += 1);",
             "assert(_rec1._expr(_rec1._capt(dog.age+=1,'arguments/0'),{content:'assert(dog.age += 1)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(dog.age    +=  1);",
             "assert(_rec1._expr(_rec1._capt(dog.age+=1,'arguments/0'),{content:'assert(dog.age += 1)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.strictEqual(dog.age += 1, three);",
             "assert.strictEqual(_rec1._expr(_rec1._capt(dog.age+=1,'arguments/0'),{content:'assert.strictEqual(dog.age += 1, three)',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(three,'arguments/1'),{content:'assert.strictEqual(dog.age += 1, three)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('ArrayExpression', function () {
        inst("assert([foo, bar]);",
             "assert(_rec1._expr(_rec1._capt([_rec1._capt(foo,'arguments/0/elements/0'),_rec1._capt(bar,'arguments/0/elements/1')],'arguments/0'),{content:'assert([foo,bar])',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(typeof [[foo.bar, baz(moo)], + fourStr] === 'number');",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(typeof _rec1._capt([_rec1._capt([_rec1._capt(_rec1._capt(foo,'arguments/0/left/argument/elements/0/elements/0/object').bar,'arguments/0/left/argument/elements/0/elements/0'),_rec1._capt(baz(_rec1._capt(moo,'arguments/0/left/argument/elements/0/elements/1/arguments/0')),'arguments/0/left/argument/elements/0/elements/1')],'arguments/0/left/argument/elements/0'),_rec1._capt(+_rec1._capt(fourStr,'arguments/0/left/argument/elements/1/argument'),'arguments/0/left/argument/elements/1')],'arguments/0/left/argument'),'arguments/0/left')==='number','arguments/0'),{content:'assert(typeof [[foo.bar,baz(moo)],+fourStr] === \\'number\\')',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.notDeepEqual([foo, bar], [hoge, fuga, piyo]);",
             "assert.notDeepEqual(_rec1._expr(_rec1._capt([_rec1._capt(foo,'arguments/0/elements/0'),_rec1._capt(bar,'arguments/0/elements/1')],'arguments/0'),{content:'assert.notDeepEqual([foo,bar], [hoge,fuga,piyo])',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt([_rec2._capt(hoge,'arguments/1/elements/0'),_rec2._capt(fuga,'arguments/1/elements/1'),_rec2._capt(piyo,'arguments/1/elements/2')],'arguments/1'),{content:'assert.notDeepEqual([foo,bar], [hoge,fuga,piyo])',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('UpdateExpression', function () {
        inst("assert(++foo);",
             "assert(_rec1._expr(_rec1._capt(++foo,'arguments/0'),{content:'assert(++foo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(bar--);",
             "assert(_rec1._expr(_rec1._capt(bar--,'arguments/0'),{content:'assert(bar--)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.strictEqual(++foo, bar--);",
             "assert.strictEqual(_rec1._expr(_rec1._capt(++foo,'arguments/0'),{content:'assert.strictEqual(++foo, bar--)',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(bar--,'arguments/1'),{content:'assert.strictEqual(++foo, bar--)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('ConditionalExpression', function () {
        inst("assert(foo ? bar : baz);",
             "assert(_rec1._expr(_rec1._capt(foo,'arguments/0/test')?_rec1._capt(bar,'arguments/0/consequent'):_rec1._capt(baz,'arguments/0/alternate'),{content:'assert(foo ? bar : baz)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(falsy ? truthy : truthy ? anotherFalsy : truthy);",
             "assert(_rec1._expr(_rec1._capt(falsy,'arguments/0/test')?_rec1._capt(truthy,'arguments/0/consequent'):_rec1._capt(truthy,'arguments/0/alternate/test')?_rec1._capt(anotherFalsy,'arguments/0/alternate/consequent'):_rec1._capt(truthy,'arguments/0/alternate/alternate'),{content:'assert(falsy ? truthy : truthy ? anotherFalsy : truthy)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(foo() ? bar.baz : (typeof goo));",
             "assert(_rec1._expr(_rec1._capt(foo(),'arguments/0/test')?_rec1._capt(_rec1._capt(bar,'arguments/0/consequent/object').baz,'arguments/0/consequent'):_rec1._capt(typeof goo,'arguments/0/alternate'),{content:'assert(foo() ? bar.baz : typeof goo)',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.equal((foo ? bar : baz), (falsy ? truthy : truthy ? anotherFalsy : truthy));",
             "assert.equal(_rec1._expr(_rec1._capt(foo,'arguments/0/test')?_rec1._capt(bar,'arguments/0/consequent'):_rec1._capt(baz,'arguments/0/alternate'),{content:'assert.equal(foo ? bar : baz, falsy ? truthy : truthy ? anotherFalsy : truthy)',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(falsy,'arguments/1/test')?_rec2._capt(truthy,'arguments/1/consequent'):_rec2._capt(truthy,'arguments/1/alternate/test')?_rec2._capt(anotherFalsy,'arguments/1/alternate/consequent'):_rec2._capt(truthy,'arguments/1/alternate/alternate'),{content:'assert.equal(foo ? bar : baz, falsy ? truthy : truthy ? anotherFalsy : truthy)',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('Literal: regular expression will not be instrumented', function () {
        inst("assert(/^not/.exec(str));",
             "assert(_rec1._expr(_rec1._capt(/^not/.exec(_rec1._capt(str,'arguments/0/arguments/0')),'arguments/0'),{content:'assert(/^not/.exec(str))',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('ObjectExpression', function () {
        inst("assert({foo: bar, hoge: fuga});",
             "assert(_rec1._expr(_rec1._capt({foo:_rec1._capt(bar,'arguments/0/properties/0/value'),hoge:_rec1._capt(fuga,'arguments/0/properties/1/value')},'arguments/0'),{content:'assert({foo: bar,hoge: fuga})',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(!({ foo: bar.baz, name: nameOf({firstName: first, lastName: last}) }));",
             "assert(_rec1._expr(_rec1._capt(!_rec1._capt({foo:_rec1._capt(_rec1._capt(bar,'arguments/0/argument/properties/0/value/object').baz,'arguments/0/argument/properties/0/value'),name:_rec1._capt(nameOf(_rec1._capt({firstName:_rec1._capt(first,'arguments/0/argument/properties/1/value/arguments/0/properties/0/value'),lastName:_rec1._capt(last,'arguments/0/argument/properties/1/value/arguments/0/properties/1/value')},'arguments/0/argument/properties/1/value/arguments/0')),'arguments/0/argument/properties/1/value')},'arguments/0/argument'),'arguments/0'),{content:'assert(!{foo: bar.baz,name: nameOf({firstName: first,lastName: last})})',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.deepEqual({foo: bar, hoge: fuga}, {hoge: fuga, foo: bar});",
             "assert.deepEqual(_rec1._expr(_rec1._capt({foo:_rec1._capt(bar,'arguments/0/properties/0/value'),hoge:_rec1._capt(fuga,'arguments/0/properties/1/value')},'arguments/0'),{content:'assert.deepEqual({foo: bar,hoge: fuga}, {hoge: fuga,foo: bar})',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt({hoge:_rec2._capt(fuga,'arguments/1/properties/0/value'),foo:_rec2._capt(bar,'arguments/1/properties/1/value')},'arguments/1'),{content:'assert.deepEqual({foo: bar,hoge: fuga}, {hoge: fuga,foo: bar})',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('NewExpression', function () {
        inst("assert(new Date());",
             "assert(_rec1._expr(_rec1._capt(new Date(),'arguments/0'),{content:'assert(new Date())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(new foo.bar.Baz());",
             "assert(_rec1._expr(_rec1._capt(new(_rec1._capt(_rec1._capt(foo,'arguments/0/callee/object/object').bar,'arguments/0/callee/object')).Baz(),'arguments/0'),{content:'assert(new foo.bar.Baz())',filepath:'path/to/some_test.js',line:1}));");

        inst("assert(!(new Array(foo, bar, baz)));",
             "assert(_rec1._expr(_rec1._capt(!_rec1._capt(new Array(_rec1._capt(foo,'arguments/0/argument/arguments/0'),_rec1._capt(bar,'arguments/0/argument/arguments/1'),_rec1._capt(baz,'arguments/0/argument/arguments/2')),'arguments/0/argument'),'arguments/0'),{content:'assert(!new Array(foo, bar, baz))',filepath:'path/to/some_test.js',line:1}));");

        inst("assert.notEqual(new Date(), new Date('2013-01-12'));",
             "assert.notEqual(_rec1._expr(_rec1._capt(new Date(),'arguments/0'),{content:'assert.notEqual(new Date(), new Date(\\'2013-01-12\\'))',filepath:'path/to/some_test.js',line:1}),_rec2._expr(_rec2._capt(new Date('2013-01-12'),'arguments/1'),{content:'assert.notEqual(new Date(), new Date(\\'2013-01-12\\'))',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('FunctionExpression: body will not be instrumented', function () {
        inst("assert(function (a, b) { return a + b; });",
             "assert(function(a,b){return a+b;});");
        inst("assert(baz === (function (a, b) { return a + b; })(foo, bar));",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(baz,'arguments/0/left')===_rec1._capt(function(a,b){return a+b;}(_rec1._capt(foo,'arguments/0/right/arguments/0'),_rec1._capt(bar,'arguments/0/right/arguments/1')),'arguments/0/right'),'arguments/0'),{content:'assert(baz === function (a, b) {return a + b;}(foo, bar))',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('Literal: multibyte string literal', function () {
        inst("assert(fuga !== 'ふが');",
             "assert(_rec1._expr(_rec1._capt(_rec1._capt(fuga,'arguments/0/left')!=='ふが','arguments/0'),{content:'assert(fuga !== \\'ふが\\')',filepath:'path/to/some_test.js',line:1}));");

        inst("assert('ほげ' !== 'ふが');",
             "assert(_rec1._expr(_rec1._capt('ほげ'!=='ふが','arguments/0'),{content:'assert(\\'ほげ\\' !== \\'ふが\\')',filepath:'path/to/some_test.js',line:1}));");
    });


    describe('ES6', function () {

        describe('TemplateLiteral', function () {
            inst("assert(`Hello`);",
                 "assert(_rec1._expr(_rec1._capt(`Hello`,'arguments/0'),{content:'assert(`Hello`)',filepath:'path/to/some_test.js',line:1}));");
            inst("assert(`Hello, ${nickname}`);",
                 "assert(_rec1._expr(_rec1._capt(`Hello, ${_rec1._capt(nickname,'arguments/0/expressions/0')}`,'arguments/0'),{content:'assert(`Hello, ${ nickname }`)',filepath:'path/to/some_test.js',line:1}));");
            inst("assert(`Hello, ${user.nickname}`);",
                 "assert(_rec1._expr(_rec1._capt(`Hello, ${_rec1._capt(_rec1._capt(user,'arguments/0/expressions/0/object').nickname,'arguments/0/expressions/0')}`,'arguments/0'),{content:'assert(`Hello, ${ user.nickname }`)',filepath:'path/to/some_test.js',line:1}));");
        });

        describe('TaggedTemplateExpression', function () {
            inst("assert(fn`a${1}`);",
                 "assert(_rec1._expr(_rec1._capt(fn`a${1}`,'arguments/0'),{content:'assert(fn`a${ 1 }`)',filepath:'path/to/some_test.js',line:1}));");
            inst("assert(fn`a${foo}b${bar}c${baz}`);",
                 "assert(_rec1._expr(_rec1._capt(fn`a${_rec1._capt(foo,'arguments/0/quasi/expressions/0')}b${_rec1._capt(bar,'arguments/0/quasi/expressions/1')}c${_rec1._capt(baz,'arguments/0/quasi/expressions/2')}`,'arguments/0'),{content:'assert(fn`a${ foo }b${ bar }c${ baz }`)',filepath:'path/to/some_test.js',line:1}));");
            inst("assert(fn`driver ${bob.name}, navigator ${alice.getName()}`);",
                 "assert(_rec1._expr(_rec1._capt(fn`driver ${_rec1._capt(_rec1._capt(bob,'arguments/0/quasi/expressions/0/object').name,'arguments/0/quasi/expressions/0')}, navigator ${_rec1._capt(_rec1._capt(alice,'arguments/0/quasi/expressions/1/callee/object').getName(),'arguments/0/quasi/expressions/1')}`,'arguments/0'),{content:'assert(fn`driver ${ bob.name }, navigator ${ alice.getName() }`)',filepath:'path/to/some_test.js',line:1}));");
        });

        describe('ArrowFunctionExpression: body will not be instrumented', function () {
            inst("assert(v => v + 1);",
                 "assert(v=>v+1);");
            inst("assert((v, i) => v + i);",
                 "assert((v,i)=>v+i);");
            inst("assert(v => ({even: v, odd: v + 1}));",
                 "assert(v=>({even:v,odd:v+1}));");
            inst("assert(seven === ((v, i) => v + i)(four, five));",
                 "assert(_rec1._expr(_rec1._capt(_rec1._capt(seven,'arguments/0/left')===_rec1._capt(((v,i)=>v+i)(_rec1._capt(four,'arguments/0/right/arguments/0'),_rec1._capt(five,'arguments/0/right/arguments/1')),'arguments/0/right'),'arguments/0'),{content:'assert(seven === ((v, i) => v + i)(four, five))',filepath:'path/to/some_test.js',line:1}));");
        });

        describe('ClassExpression: body will not be instrumented', function () {
            inst("assert(class Me { getClassName() { return foo + Me.name; } });",
                 "assert(class Me{getClassName(){return foo+Me.name;}});");
        });

        describe('AssignmentExpression: left hand side of Destructuring will not be instrumented', function () {
            inst("assert([x] = [3]);",
                 "assert(_rec1._expr(_rec1._capt([x]=_rec1._capt([3],'arguments/0/right'),'arguments/0'),{content:'assert([x] = [3])',filepath:'path/to/some_test.js',line:1}));");
            inst("assert([x] = [foo]);",
                 "assert(_rec1._expr(_rec1._capt([x]=_rec1._capt([_rec1._capt(foo,'arguments/0/right/elements/0')],'arguments/0/right'),'arguments/0'),{content:'assert([x] = [foo])',filepath:'path/to/some_test.js',line:1}));");
        });

        describe('Literal: Binary and Octal Literals', function () {
            inst("assert(0b111110111);",
                 "assert(503);");
            inst("assert(0o767);",
                 "assert(503);");
        });

        describe('SpreadElement', function () {
            inst("assert(hello(...names));",
                 "assert(_rec1._expr(_rec1._capt(hello(..._rec1._capt(names,'arguments/0/arguments/0/argument')),'arguments/0'),{content:'assert(hello(...names))',filepath:'path/to/some_test.js',line:1}));");
            inst("assert([head, ...tail].length);",
                 "assert(_rec1._expr(_rec1._capt(_rec1._capt([_rec1._capt(head,'arguments/0/object/elements/0'),..._rec1._capt(tail,'arguments/0/object/elements/1/argument')],'arguments/0/object').length,'arguments/0'),{content:'assert([head,...tail].length)',filepath:'path/to/some_test.js',line:1}));");
            inst("assert(f(head, ...iter(), ...[foo, bar]));",
                 "assert(_rec1._expr(_rec1._capt(f(_rec1._capt(head,'arguments/0/arguments/0'),..._rec1._capt(iter(),'arguments/0/arguments/1/argument'),..._rec1._capt([_rec1._capt(foo,'arguments/0/arguments/2/argument/elements/0'),_rec1._capt(bar,'arguments/0/arguments/2/argument/elements/1')],'arguments/0/arguments/2/argument')),'arguments/0'),{content:'assert(f(head, ...iter(), ...[foo,bar]))',filepath:'path/to/some_test.js',line:1}));");
        });

        var prelude = "var _PowerAssertRecorder1=function(){function PowerAssertRecorder(){this.captured=[];}PowerAssertRecorder.prototype._capt=function _capt(value,espath){this.captured.push({value:value,espath:espath});return value;};PowerAssertRecorder.prototype._expr=function _expr(value,source){return{powerAssertContext:{value:value,events:this.captured},source:source};};return PowerAssertRecorder;}();";

        describe('YieldExpression', function () {
            inst("function *gen() {assert((yield bigOrSmall(size)) === 'big')}",
                 prelude + "function*gen(){assert(_rec1._expr(_rec1._capt(_rec1._capt(yield bigOrSmall(_rec1._capt(size,'arguments/0/left/argument/arguments/0')),'arguments/0/left')==='big','arguments/0'),{content:'assert((yield bigOrSmall(size)) === \\'big\\')',filepath:'path/to/some_test.js',line:1,generator:true}));}");
        });

        describe('disambiguation: YieldExpression vs FunctionCall', function () {
            inst("function baz() {assert((yield (foo)) === bar)}",
                 prelude + "function baz(){assert(_rec1._expr(_rec1._capt(_rec1._capt(yield(_rec1._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(yield(foo) === bar)',filepath:'path/to/some_test.js',line:1}));}");

            inst("function *baz() {assert((yield (foo)) === bar)}",
                 prelude + "function*baz(){assert(_rec1._expr(_rec1._capt(_rec1._capt(yield foo,'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((yield foo) === bar)',filepath:'path/to/some_test.js',line:1,generator:true}));}");

            inst("var baz = function () {assert((yield (foo)) === bar)}",
                 prelude + "var baz=function(){assert(_rec1._expr(_rec1._capt(_rec1._capt(yield(_rec1._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(yield(foo) === bar)',filepath:'path/to/some_test.js',line:1}));};");

            inst("var baz = function *() {assert((yield (foo)) === bar)}",
                 prelude + "var baz=function*(){assert(_rec1._expr(_rec1._capt(_rec1._capt(yield foo,'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((yield foo) === bar)',filepath:'path/to/some_test.js',line:1,generator:true}));};");
        });

        describe('AwaitExpression', function () {
            inst("async function gen() {assert((await bigOrSmall(size)) === 'big')}",
                 prelude + "async function gen(){assert(_rec1._expr(_rec1._capt(_rec1._capt(await bigOrSmall(_rec1._capt(size,'arguments/0/left/argument/arguments/0')),'arguments/0/left')==='big','arguments/0'),{content:'assert((await bigOrSmall(size)) === \\'big\\')',filepath:'path/to/some_test.js',line:1,async:true}));}");
        });

        describe('disambiguation: AwaitExpression vs FunctionCall', function () {
            inst("function baz() {assert((await (foo)) === bar)}",
                 prelude + "function baz(){assert(_rec1._expr(_rec1._capt(_rec1._capt(await(_rec1._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(await(foo) === bar)',filepath:'path/to/some_test.js',line:1}));}");

            inst("async function baz() {assert((await (foo)) === bar)}",
                 prelude + "async function baz(){assert(_rec1._expr(_rec1._capt(_rec1._capt(await foo,'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((await foo) === bar)',filepath:'path/to/some_test.js',line:1,async:true}));}");

            inst("var baz = function () {assert((await (foo)) === bar)}",
                 prelude + "var baz=function(){assert(_rec1._expr(_rec1._capt(_rec1._capt(await(_rec1._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(await(foo) === bar)',filepath:'path/to/some_test.js',line:1}));};");

            inst("var baz = async function () {assert((await (foo)) === bar)}",
                 prelude + "var baz=async function(){assert(_rec1._expr(_rec1._capt(_rec1._capt(await foo,'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((await foo) === bar)',filepath:'path/to/some_test.js',line:1,async:true}));};");

            inst("var baz = () => {assert((await (foo)) === bar)};",
                 prelude + "var baz=()=>{assert(_rec1._expr(_rec1._capt(_rec1._capt(await(_rec1._capt(foo,'arguments/0/left/arguments/0')),'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert(await(foo) === bar)',filepath:'path/to/some_test.js',line:1}));};");

            inst("var baz = async () => {assert((await (foo)) === bar)}",
                 prelude + "var baz=async()=>{assert(_rec1._expr(_rec1._capt(_rec1._capt(await foo,'arguments/0/left')===_rec1._capt(bar,'arguments/0/right'),'arguments/0'),{content:'assert((await foo) === bar)',filepath:'path/to/some_test.js',line:1,async:true}));};");
        });

        describe('Enhanced Object Literals', function () {

            describe('Property: Computed (dynamic) property names', function () {
                inst("assert({[num]: foo});",
                     "assert(_rec1._expr(_rec1._capt({[_rec1._capt(num,'arguments/0/properties/0/key')]:_rec1._capt(foo,'arguments/0/properties/0/value')},'arguments/0'),{content:'assert({ [num]: foo })',filepath:'path/to/some_test.js',line:1}));");

                inst("assert({[ 'prop_' + (() => bar())() ]: 42});",
                     "assert(_rec1._expr(_rec1._capt({[_rec1._capt('prop_'+_rec1._capt((()=>bar())(),'arguments/0/properties/0/key/right'),'arguments/0/properties/0/key')]:42},'arguments/0'),{content:'assert({ [\\'prop_\\' + (() => bar())()]: 42 })',filepath:'path/to/some_test.js',line:1}));");

                inst("assert({[`prop_${generate(seed)}`]: foo});",
                     "assert(_rec1._expr(_rec1._capt({[_rec1._capt(`prop_${_rec1._capt(generate(_rec1._capt(seed,'arguments/0/properties/0/key/expressions/0/arguments/0')),'arguments/0/properties/0/key/expressions/0')}`,'arguments/0/properties/0/key')]:_rec1._capt(foo,'arguments/0/properties/0/value')},'arguments/0'),{content:'assert({ [`prop_${ generate(seed) }`]: foo })',filepath:'path/to/some_test.js',line:1}));");
            });

            describe('Property: shorthand literal itself will not be instrumented', function () {
                inst("assert({foo});",
                     "assert(_rec1._expr(_rec1._capt({foo},'arguments/0'),{content:'assert({ foo })',filepath:'path/to/some_test.js',line:1}));");

                inst("assert({foo, bar: baz});",
                     "assert(_rec1._expr(_rec1._capt({foo,bar:_rec1._capt(baz,'arguments/0/properties/1/value')},'arguments/0'),{content:'assert({foo,bar: baz})',filepath:'path/to/some_test.js',line:1}));");
            });
        });
    });

});

}));
