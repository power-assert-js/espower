(function (root, factory) {
    'use strict';

    var dependencies = [
        '../lib/espower',
        'esprima',
        'escodegen',
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
    assert
) {

// see: https://github.com/Constellation/escodegen/issues/115
if (typeof define === 'function' && define.amd) {
    escodegen = window.escodegen;
}

describe('instrumentation spec', function () {
    function testWithEsprimaOptions (jsCode, expected, options) {
        it(jsCode, function () {
            var jsAST = esprima.parse(jsCode, options),
                espoweredAST = espower(jsAST, {source: jsCode, path: '/path/to/some_test.js'}),
                instrumentedCode = escodegen.generate(espoweredAST, {format: {compact: true}});
            assert.equal(instrumentedCode, expected);
        });
    }

    function inst (jsCode, expected) {
        describe('with loc, range, tokens', function () {
            var options = {tolerant: true, loc: true, range: true, tokens: true};
            testWithEsprimaOptions(jsCode, expected, options);
        });
        describe('with loc, range', function () {
            var options = {tolerant: true, loc: true, range: true};
            testWithEsprimaOptions(jsCode, expected, options);
        });
        describe('with loc, tokens', function () {
            var options = {tolerant: true, loc: true, tokens: true, raw: true};
            testWithEsprimaOptions(jsCode, expected, options);
        });
        describe('with loc', function () {
            var options = {tolerant: true, loc: true};
            testWithEsprimaOptions(jsCode, expected, options);
        });
    }


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
    });


    describe('Identifier', function () {
        inst("assert(falsyStr);",
             "assert(assert._expr(assert._capt(falsyStr,''),{content:'assert(falsyStr)',filepath:'/path/to/some_test.js'}));");

        inst("assert(falsyStr, messageStr);",
             "assert(assert._expr(assert._capt(falsyStr,''),{content:'assert(falsyStr, messageStr)',filepath:'/path/to/some_test.js'}),messageStr);");

        inst("assert.equal(str, anotherStr);",
             "assert.equal(assert._expr(assert._capt(str,''),{content:'assert.equal(str, anotherStr)',filepath:'/path/to/some_test.js'}),assert._expr(assert._capt(anotherStr,''),{content:'assert.equal(str, anotherStr)',filepath:'/path/to/some_test.js'}));");

        inst("assert.equal(str, anotherStr, messageStr);",
             "assert.equal(assert._expr(assert._capt(str,''),{content:'assert.equal(str, anotherStr, messageStr)',filepath:'/path/to/some_test.js'}),assert._expr(assert._capt(anotherStr,''),{content:'assert.equal(str, anotherStr, messageStr)',filepath:'/path/to/some_test.js'}),messageStr);");
    });


    describe('BinaryExpression', function () {
        inst("assert(4 !== 4);",
             "assert(assert._expr(assert._capt(4!==4,''),{content:'assert(4 !== 4)',filepath:'/path/to/some_test.js'}));");

        inst("assert(fuga !== 4);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'left')!==4,''),{content:'assert(fuga !== 4)',filepath:'/path/to/some_test.js'}));");

        inst("assert(fuga === piyo);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'left')===assert._capt(piyo,'right'),''),{content:'assert(fuga === piyo)',filepath:'/path/to/some_test.js'}));");

        inst("assert(fuga   ===   piyo);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'left')===assert._capt(piyo,'right'),''),{content:'assert(fuga === piyo)',filepath:'/path/to/some_test.js'}));");

        inst("assert(fuga !== piyo);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'left')!==assert._capt(piyo,'right'),''),{content:'assert(fuga !== piyo)',filepath:'/path/to/some_test.js'}));");

        inst("assert.ok(hoge === fuga, 'comment');",
             "assert.ok(assert._expr(assert._capt(assert._capt(hoge,'left')===assert._capt(fuga,'right'),''),{content:'assert.ok(hoge === fuga, \\'comment\\')',filepath:'/path/to/some_test.js'}),'comment');");

        inst("assert(ary1.length === ary2.length);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(ary1,'left/object').length,'left')===assert._capt(assert._capt(ary2,'right/object').length,'right'),''),{content:'assert(ary1.length === ary2.length)',filepath:'/path/to/some_test.js'}));");
    });


    describe('UnaryExpression', function () {
        inst("assert(!truth);",
             "assert(assert._expr(assert._capt(!assert._capt(truth,'argument'),''),{content:'assert(!truth)',filepath:'/path/to/some_test.js'}));");

        inst("assert(!!some);",
             "assert(assert._expr(assert._capt(!assert._capt(!assert._capt(some,'argument/argument'),'argument'),''),{content:'assert(!!some)',filepath:'/path/to/some_test.js'}));");

        inst("assert(!!foo.bar);",
             "assert(assert._expr(assert._capt(!assert._capt(!assert._capt(assert._capt(foo,'argument/argument/object').bar,'argument/argument'),'argument'),''),{content:'assert(!!foo.bar)',filepath:'/path/to/some_test.js'}));");

        inst("assert(delete foo);",
             "assert(assert._expr(assert._capt(delete foo,''),{content:'assert(delete foo)',filepath:'/path/to/some_test.js'}));");

        inst("assert(delete foo.bar);",
             "assert(assert._expr(assert._capt(delete assert._capt(assert._capt(foo,'argument/object').bar,'argument'),''),{content:'assert(delete foo.bar)',filepath:'/path/to/some_test.js'}));");

        inst("assert(typeof foo !== 'undefined');",
             "assert(assert._expr(assert._capt(assert._capt(typeof foo,'left')!=='undefined',''),{content:'assert(typeof foo !== \\'undefined\\')',filepath:'/path/to/some_test.js'}));");

        inst("assert(typeof foo.bar !== 'undefined');",
             "assert(assert._expr(assert._capt(assert._capt(typeof assert._capt(assert._capt(foo,'left/argument/object').bar,'left/argument'),'left')!=='undefined',''),{content:'assert(typeof foo.bar !== \\'undefined\\')',filepath:'/path/to/some_test.js'}));");

        inst("assert.strictEqual(typeof foo, typeof bar);",
             "assert.strictEqual(assert._expr(assert._capt(typeof foo,''),{content:'assert.strictEqual(typeof foo, typeof bar)',filepath:'/path/to/some_test.js'}),assert._expr(assert._capt(typeof bar,''),{content:'assert.strictEqual(typeof foo, typeof bar)',filepath:'/path/to/some_test.js'}));");
    });


    describe('LogicalExpression', function () {
        inst("assert(5 < actual && actual < 13);",
             "assert(assert._expr(assert._capt(assert._capt(5<assert._capt(actual,'left/right'),'left')&&assert._capt(assert._capt(actual,'right/left')<13,'right'),''),{content:'assert(5 < actual && actual < 13)',filepath:'/path/to/some_test.js'}));");

        inst("assert.ok(actual < 5 || 13 < actual);",
             "assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(actual,'left/left')<5,'left')||assert._capt(13<assert._capt(actual,'right/right'),'right'),''),{content:'assert.ok(actual < 5 || 13 < actual)',filepath:'/path/to/some_test.js'}));");

        inst("assert(2 > actual && actual < 13);",
             "assert(assert._expr(assert._capt(assert._capt(2>assert._capt(actual,'left/right'),'left')&&assert._capt(assert._capt(actual,'right/left')<13,'right'),''),{content:'assert(2 > actual && actual < 13)',filepath:'/path/to/some_test.js'}));");

        inst("assert(2   >   actual    &&  actual     <  13);",
             "assert(assert._expr(assert._capt(assert._capt(2>assert._capt(actual,'left/right'),'left')&&assert._capt(assert._capt(actual,'right/left')<13,'right'),''),{content:'assert(2 > actual && actual < 13)',filepath:'/path/to/some_test.js'}));");

        inst("assert.equal(5 < actual && actual < 13, falsy);",
             "assert.equal(assert._expr(assert._capt(assert._capt(5<assert._capt(actual,'left/right'),'left')&&assert._capt(assert._capt(actual,'right/left')<13,'right'),''),{content:'assert.equal(5 < actual && actual < 13, falsy)',filepath:'/path/to/some_test.js'}),assert._expr(assert._capt(falsy,''),{content:'assert.equal(5 < actual && actual < 13, falsy)',filepath:'/path/to/some_test.js'}));");
    });


    describe('MemberExpression', function () {
        inst("assert(foo.bar);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'object').bar,''),{content:'assert(foo.bar)',filepath:'/path/to/some_test.js'}));");

        inst("assert(foo.bar.baz);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(foo,'object/object').bar,'object').baz,''),{content:'assert(foo.bar.baz)',filepath:'/path/to/some_test.js'}));");

        inst("assert(foo['bar']);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'object')['bar'],''),{content:'assert(foo[\\'bar\\'])',filepath:'/path/to/some_test.js'}));");

        inst("assert(foo[propName]);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'object')[assert._capt(propName,'property')],''),{content:'assert(foo[propName])',filepath:'/path/to/some_test.js'}));");

        inst("assert(foo  [  propName  ]  );",
             "assert(assert._expr(assert._capt(assert._capt(foo,'object')[assert._capt(propName,'property')],''),{content:'assert(foo[propName])',filepath:'/path/to/some_test.js'}));");

        inst("assert(foo[func(key)]);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'object')[assert._capt(func(assert._capt(key,'property/arguments/0')),'property')],''),{content:'assert(foo[func(key)])',filepath:'/path/to/some_test.js'}));");

        inst("assert(foo[propName]['key'][keys()['name']]);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(assert._capt(foo,'object/object/object')[assert._capt(propName,'object/object/property')],'object/object')['key'],'object')[assert._capt(assert._capt(keys(),'property/object')['name'],'property')],''),{content:'assert(foo[propName][\\'key\\'][keys()[\\'name\\']])',filepath:'/path/to/some_test.js'}));");

        inst("assert( foo [  propName  ] [  'key' ]   [ keys  (  )  [   'name'  ] ]  );",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(assert._capt(foo,'object/object/object')[assert._capt(propName,'object/object/property')],'object/object')['key'],'object')[assert._capt(assert._capt(keys(),'property/object')['name'],'property')],''),{content:'assert(foo[propName][\\'key\\'][keys()[\\'name\\']])',filepath:'/path/to/some_test.js'}));");

        inst("assert.equal(ary1.length, ary2.length);",
             "assert.equal(assert._expr(assert._capt(assert._capt(ary1,'object').length,''),{content:'assert.equal(ary1.length, ary2.length)',filepath:'/path/to/some_test.js'}),assert._expr(assert._capt(assert._capt(ary2,'object').length,''),{content:'assert.equal(ary1.length, ary2.length)',filepath:'/path/to/some_test.js'}));");

        inst("assert.deepEqual(foo.propName, foo[key]);",
             "assert.deepEqual(assert._expr(assert._capt(assert._capt(foo,'object').propName,''),{content:'assert.deepEqual(foo.propName, foo[key])',filepath:'/path/to/some_test.js'}),assert._expr(assert._capt(assert._capt(foo,'object')[assert._capt(key,'property')],''),{content:'assert.deepEqual(foo.propName, foo[key])',filepath:'/path/to/some_test.js'}));");
    });


    describe('CallExpression', function () {
        inst("assert(func());",
             "assert(assert._expr(assert._capt(func(),''),{content:'assert(func())',filepath:'/path/to/some_test.js'}));");

        inst("assert(obj.age());",
             "assert(assert._expr(assert._capt(assert._capt(obj,'callee/object').age(),''),{content:'assert(obj.age())',filepath:'/path/to/some_test.js'}));");

        inst("assert(isFalsy(positiveInt));",
             "assert(assert._expr(assert._capt(isFalsy(assert._capt(positiveInt,'arguments/0')),''),{content:'assert(isFalsy(positiveInt))',filepath:'/path/to/some_test.js'}));");

        inst("assert(foo[propName]());",
             "assert(assert._expr(assert._capt(assert._capt(foo,'callee/object')[assert._capt(propName,'callee/property')](),''),{content:'assert(foo[propName]())',filepath:'/path/to/some_test.js'}));");

        inst("assert(foo[hoge[fuga[piyo]]]());",
             "assert(assert._expr(assert._capt(assert._capt(foo,'callee/object')[assert._capt(assert._capt(hoge,'callee/property/object')[assert._capt(assert._capt(fuga,'callee/property/property/object')[assert._capt(piyo,'callee/property/property/property')],'callee/property/property')],'callee/property')](),''),{content:'assert(foo[hoge[fuga[piyo]]]())',filepath:'/path/to/some_test.js'}));");

        inst("assert(sum(one, two, three) === seven);",
             "assert(assert._expr(assert._capt(assert._capt(sum(assert._capt(one,'left/arguments/0'),assert._capt(two,'left/arguments/1'),assert._capt(three,'left/arguments/2')),'left')===assert._capt(seven,'right'),''),{content:'assert(sum(one, two, three) === seven)',filepath:'/path/to/some_test.js'}));");

        inst("assert(sum(sum(one, two), three) === sum(sum(two, three), seven));",
             "assert(assert._expr(assert._capt(assert._capt(sum(assert._capt(sum(assert._capt(one,'left/arguments/0/arguments/0'),assert._capt(two,'left/arguments/0/arguments/1')),'left/arguments/0'),assert._capt(three,'left/arguments/1')),'left')===assert._capt(sum(assert._capt(sum(assert._capt(two,'right/arguments/0/arguments/0'),assert._capt(three,'right/arguments/0/arguments/1')),'right/arguments/0'),assert._capt(seven,'right/arguments/1')),'right'),''),{content:'assert(sum(sum(one, two), three) === sum(sum(two, three), seven))',filepath:'/path/to/some_test.js'}));");

        inst("assert(math.calc.sum(one, two, three) === seven);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(assert._capt(math,'left/callee/object/object').calc,'left/callee/object').sum(assert._capt(one,'left/arguments/0'),assert._capt(two,'left/arguments/1'),assert._capt(three,'left/arguments/2')),'left')===assert._capt(seven,'right'),''),{content:'assert(math.calc.sum(one, two, three) === seven)',filepath:'/path/to/some_test.js'}));");

        inst("assert((three * (seven * ten)) === three);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(three,'left/left')*assert._capt(assert._capt(seven,'left/right/left')*assert._capt(ten,'left/right/right'),'left/right'),'left')===assert._capt(three,'right'),''),{content:'assert(three * (seven * ten) === three)',filepath:'/path/to/some_test.js'}));");

        inst("assert(!concat(fuga, piyo));",
             "assert(assert._expr(assert._capt(!assert._capt(concat(assert._capt(fuga,'argument/arguments/0'),assert._capt(piyo,'argument/arguments/1')),'argument'),''),{content:'assert(!concat(fuga, piyo))',filepath:'/path/to/some_test.js'}));");

        inst("assert.strictEqual((three * (seven * ten)), math.calc.sum(one, two, three));",
             "assert.strictEqual(assert._expr(assert._capt(assert._capt(three,'left')*assert._capt(assert._capt(seven,'right/left')*assert._capt(ten,'right/right'),'right'),''),{content:'assert.strictEqual(three * (seven * ten), math.calc.sum(one, two, three))',filepath:'/path/to/some_test.js'}),assert._expr(assert._capt(assert._capt(assert._capt(math,'callee/object/object').calc,'callee/object').sum(assert._capt(one,'arguments/0'),assert._capt(two,'arguments/1'),assert._capt(three,'arguments/2')),''),{content:'assert.strictEqual(three * (seven * ten), math.calc.sum(one, two, three))',filepath:'/path/to/some_test.js'}));");
    });


    describe('AssignmentExpression', function () {
        inst("assert(counter += 1);",
             "assert(assert._expr(assert._capt(counter+=1,''),{content:'assert(counter += 1)',filepath:'/path/to/some_test.js'}));");

        inst("assert(dog.age += 1);",
             "assert(assert._expr(assert._capt(dog.age+=1,''),{content:'assert(dog.age += 1)',filepath:'/path/to/some_test.js'}));");

        inst("assert(dog.age    +=  1);",
             "assert(assert._expr(assert._capt(dog.age+=1,''),{content:'assert(dog.age += 1)',filepath:'/path/to/some_test.js'}));");

        inst("assert.strictEqual(dog.age += 1, three);",
             "assert.strictEqual(assert._expr(assert._capt(dog.age+=1,''),{content:'assert.strictEqual(dog.age += 1, three)',filepath:'/path/to/some_test.js'}),assert._expr(assert._capt(three,''),{content:'assert.strictEqual(dog.age += 1, three)',filepath:'/path/to/some_test.js'}));");
    });


    describe('ArrayExpression', function () {
        inst("assert([foo, bar]);",
             "assert(assert._expr([assert._capt(foo,'elements/0'),assert._capt(bar,'elements/1')],{content:'assert([foo,bar])',filepath:'/path/to/some_test.js'}));");

        inst("assert(typeof [[foo.bar, baz(moo)], + fourStr] === 'number');",
             "assert(assert._expr(assert._capt(assert._capt(typeof[[assert._capt(assert._capt(foo,'left/argument/elements/0/elements/0/object').bar,'left/argument/elements/0/elements/0'),assert._capt(baz(assert._capt(moo,'left/argument/elements/0/elements/1/arguments/0')),'left/argument/elements/0/elements/1')],assert._capt(+assert._capt(fourStr,'left/argument/elements/1/argument'),'left/argument/elements/1')],'left')==='number',''),{content:'assert(typeof [[foo.bar,baz(moo)],+fourStr] === \\'number\\')',filepath:'/path/to/some_test.js'}));");

        inst("assert.notDeepEqual([foo, bar], [hoge, fuga, piyo]);",
             "assert.notDeepEqual(assert._expr([assert._capt(foo,'elements/0'),assert._capt(bar,'elements/1')],{content:'assert.notDeepEqual([foo,bar], [hoge,fuga,piyo])',filepath:'/path/to/some_test.js'}),assert._expr([assert._capt(hoge,'elements/0'),assert._capt(fuga,'elements/1'),assert._capt(piyo,'elements/2')],{content:'assert.notDeepEqual([foo,bar], [hoge,fuga,piyo])',filepath:'/path/to/some_test.js'}));");
    });


    describe('UpdateExpression', function () {
        inst("assert(++foo);",
             "assert(assert._expr(assert._capt(++foo,''),{content:'assert(++foo)',filepath:'/path/to/some_test.js'}));");

        inst("assert(bar--);",
             "assert(assert._expr(assert._capt(bar--,''),{content:'assert(bar--)',filepath:'/path/to/some_test.js'}));");

        inst("assert.strictEqual(++foo, bar--);",
             "assert.strictEqual(assert._expr(assert._capt(++foo,''),{content:'assert.strictEqual(++foo, bar--)',filepath:'/path/to/some_test.js'}),assert._expr(assert._capt(bar--,''),{content:'assert.strictEqual(++foo, bar--)',filepath:'/path/to/some_test.js'}));");
    });


    describe('ConditionalExpression', function () {
        inst("assert(foo ? bar : baz);",
             "assert(assert._expr(assert._capt(foo,'test')?assert._capt(bar,'consequent'):assert._capt(baz,'alternate'),{content:'assert(foo ? bar : baz)',filepath:'/path/to/some_test.js'}));");

        inst("assert(falsy ? truthy : truthy ? anotherFalsy : truthy);",
             "assert(assert._expr(assert._capt(falsy,'test')?assert._capt(truthy,'consequent'):assert._capt(truthy,'alternate/test')?assert._capt(anotherFalsy,'alternate/consequent'):assert._capt(truthy,'alternate/alternate'),{content:'assert(falsy ? truthy : truthy ? anotherFalsy : truthy)',filepath:'/path/to/some_test.js'}));");

        inst("assert(foo() ? bar.baz : (typeof goo));",
             "assert(assert._expr(assert._capt(foo(),'test')?assert._capt(assert._capt(bar,'consequent/object').baz,'consequent'):assert._capt(typeof goo,'alternate'),{content:'assert(foo() ? bar.baz : typeof goo)',filepath:'/path/to/some_test.js'}));");

        inst("assert.equal((foo ? bar : baz), (falsy ? truthy : truthy ? anotherFalsy : truthy));",
             "assert.equal(assert._expr(assert._capt(foo,'test')?assert._capt(bar,'consequent'):assert._capt(baz,'alternate'),{content:'assert.equal(foo ? bar : baz, falsy ? truthy : truthy ? anotherFalsy : truthy)',filepath:'/path/to/some_test.js'}),assert._expr(assert._capt(falsy,'test')?assert._capt(truthy,'consequent'):assert._capt(truthy,'alternate/test')?assert._capt(anotherFalsy,'alternate/consequent'):assert._capt(truthy,'alternate/alternate'),{content:'assert.equal(foo ? bar : baz, falsy ? truthy : truthy ? anotherFalsy : truthy)',filepath:'/path/to/some_test.js'}));");
    });


    describe('RegularExpression will not be instrumented', function () {
        inst("assert(/^not/.exec(str));",
             "assert(assert._expr(assert._capt(/^not/.exec(assert._capt(str,'arguments/0')),''),{content:'assert(/^not/.exec(str))',filepath:'/path/to/some_test.js'}));");
    });


    describe('ObjectExpression', function () {
        inst("assert({foo: bar, hoge: fuga});",
             "assert(assert._expr({foo:assert._capt(bar,'properties/0/value'),hoge:assert._capt(fuga,'properties/1/value')},{content:'assert({foo: bar,hoge: fuga})',filepath:'/path/to/some_test.js'}));");

        inst("assert(!({ foo: bar.baz, name: nameOf({firstName: first, lastName: last}) }));",
             "assert(assert._expr(assert._capt(!{foo:assert._capt(assert._capt(bar,'argument/properties/0/value/object').baz,'argument/properties/0/value'),name:assert._capt(nameOf({firstName:assert._capt(first,'argument/properties/1/value/arguments/0/properties/0/value'),lastName:assert._capt(last,'argument/properties/1/value/arguments/0/properties/1/value')}),'argument/properties/1/value')},''),{content:'assert(!{foo: bar.baz,name: nameOf({firstName: first,lastName: last})})',filepath:'/path/to/some_test.js'}));");

        inst("assert.deepEqual({foo: bar, hoge: fuga}, {hoge: fuga, foo: bar});",
             "assert.deepEqual(assert._expr({foo:assert._capt(bar,'properties/0/value'),hoge:assert._capt(fuga,'properties/1/value')},{content:'assert.deepEqual({foo: bar,hoge: fuga}, {hoge: fuga,foo: bar})',filepath:'/path/to/some_test.js'}),assert._expr({hoge:assert._capt(fuga,'properties/0/value'),foo:assert._capt(bar,'properties/1/value')},{content:'assert.deepEqual({foo: bar,hoge: fuga}, {hoge: fuga,foo: bar})',filepath:'/path/to/some_test.js'}));");
    });


    describe('NewExpression', function () {
        inst("assert(new Date());",
             "assert(assert._expr(assert._capt(new Date(),''),{content:'assert(new Date())',filepath:'/path/to/some_test.js'}));");

        inst("assert(!(new Array(foo, bar, baz)));",
             "assert(assert._expr(assert._capt(!assert._capt(new Array(assert._capt(foo,'argument/arguments/0'),assert._capt(bar,'argument/arguments/1'),assert._capt(baz,'argument/arguments/2')),'argument'),''),{content:'assert(!new Array(foo, bar, baz))',filepath:'/path/to/some_test.js'}));");

        inst("assert.notEqual(new Date(), new Date('2013-01-12'));",
             "assert.notEqual(assert._expr(assert._capt(new Date(),''),{content:'assert.notEqual(new Date(), new Date(\\'2013-01-12\\'))',filepath:'/path/to/some_test.js'}),assert._expr(assert._capt(new Date('2013-01-12'),''),{content:'assert.notEqual(new Date(), new Date(\\'2013-01-12\\'))',filepath:'/path/to/some_test.js'}));");
    });


    describe('FunctionExpression will not be instrumented', function () {
        inst("assert(baz === (function (a, b) { return a + b; })(foo, bar));",
             "assert(assert._expr(assert._capt(assert._capt(baz,'left')===assert._capt(function(a,b){return a+b;}(assert._capt(foo,'right/arguments/0'),assert._capt(bar,'right/arguments/1')),'right'),''),{content:'assert(baz === function (a, b) {return a + b;}(foo, bar))',filepath:'/path/to/some_test.js'}));");
    });
});

}));
