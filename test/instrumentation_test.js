var espower = require('../lib/espower'),
    esprima = require('esprima'),
    escodegen = require('escodegen'),
    assert = require('assert');

describe('instrumentation spec', function () {
    function extractBodyFrom (source) {
        var tree = esprima.parse(source, {tolerant: true, loc: true, range: true});
        return tree.body[0];
    }
    function inst (jsCode, expected, options) {
        it(jsCode, function () {
            var jsAST = extractBodyFrom(jsCode);
            var espoweredAST = espower(jsAST, {source: jsCode});
            var instrumentedCode = escodegen.generate(espoweredAST, {format: {compact: true}});
            assert.equal(instrumentedCode, expected);
        });
    }


    describe('Literal', function () {
        inst("assert(false);",
             "assert(false);");

        inst("assert(0);",
             "assert(0);");
    });


    describe('Identifier', function () {
        inst("assert(falsyStr);",
             "assert(assert._expr(assert._capt(falsyStr,'ident',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(falsyStr);'));");

        inst("return assert(falsyStr);",
             "return assert(assert._expr(assert._capt(falsyStr,'ident',{start:{line:1,column:14}}),{start:{line:1,column:14}},'return assert(falsyStr);'));");
    });


    describe('BinaryExpression', function () {
        inst("assert(4 !== 4);",
             "assert(assert._expr(assert._capt(4!==4,'binary',{start:{line:1,column:9}}),{start:{line:1,column:7}},'assert(4 !== 4);'));");

        inst("assert(fuga !== 4);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'ident',{start:{line:1,column:7}})!==4,'binary',{start:{line:1,column:12}}),{start:{line:1,column:7}},'assert(fuga !== 4);'));");

        inst("assert(fuga === piyo);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'ident',{start:{line:1,column:7}})===assert._capt(piyo,'ident',{start:{line:1,column:16}}),'binary',{start:{line:1,column:12}}),{start:{line:1,column:7}},'assert(fuga === piyo);'));");

        inst("assert(fuga !== piyo);",
             "assert(assert._expr(assert._capt(assert._capt(fuga,'ident',{start:{line:1,column:7}})!==assert._capt(piyo,'ident',{start:{line:1,column:16}}),'binary',{start:{line:1,column:12}}),{start:{line:1,column:7}},'assert(fuga !== piyo);'));");

        inst("assert.ok(hoge === fuga, 'comment');",
             "assert.ok(assert._expr(assert._capt(assert._capt(hoge,'ident',{start:{line:1,column:10}})===assert._capt(fuga,'ident',{start:{line:1,column:19}}),'binary',{start:{line:1,column:15}}),{start:{line:1,column:10}},'assert.ok(hoge === fuga, \\'comment\\');'),'comment');");

        inst("assert(ary1.length === ary2.length);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(ary1,'ident',{start:{line:1,column:7}}).length,'ident',{start:{line:1,column:12}})===assert._capt(assert._capt(ary2,'ident',{start:{line:1,column:23}}).length,'ident',{start:{line:1,column:28}}),'binary',{start:{line:1,column:19}}),{start:{line:1,column:7}},'assert(ary1.length === ary2.length);'));");
    });


    describe('UnaryExpression', function () {
        inst("assert(!truth);",
             "assert(assert._expr(assert._capt(!assert._capt(truth,'ident',{start:{line:1,column:8}}),'unary',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(!truth);'));");

        inst("assert(!!some);",
             "assert(assert._expr(assert._capt(!assert._capt(!assert._capt(some,'ident',{start:{line:1,column:9}}),'unary',{start:{line:1,column:8}}),'unary',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(!!some);'));");

        inst("assert(!!foo.bar);",
             "assert(assert._expr(assert._capt(!assert._capt(!assert._capt(assert._capt(foo,'ident',{start:{line:1,column:9}}).bar,'ident',{start:{line:1,column:13}}),'unary',{start:{line:1,column:8}}),'unary',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(!!foo.bar);'));");

        inst("assert(delete foo);",
             "assert(assert._expr(assert._capt(delete foo,'unary',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(delete foo);'));");

        inst("assert(delete foo.bar);",
             "assert(assert._expr(assert._capt(delete assert._capt(assert._capt(foo,'ident',{start:{line:1,column:14}}).bar,'ident',{start:{line:1,column:18}}),'unary',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(delete foo.bar);'));");

        inst("assert(typeof foo !== 'undefined');",
             "assert(assert._expr(assert._capt(assert._capt(typeof foo,'unary',{start:{line:1,column:7}})!=='undefined','binary',{start:{line:1,column:18}}),{start:{line:1,column:7}},'assert(typeof foo !== \\'undefined\\');'));");

        inst("assert(typeof foo.bar !== 'undefined');",
             "assert(assert._expr(assert._capt(assert._capt(typeof assert._capt(assert._capt(foo,'ident',{start:{line:1,column:14}}).bar,'ident',{start:{line:1,column:18}}),'unary',{start:{line:1,column:7}})!=='undefined','binary',{start:{line:1,column:22}}),{start:{line:1,column:7}},'assert(typeof foo.bar !== \\'undefined\\');'));");
    });


    describe('LogicalExpression', function () {
        inst("assert(5 < actual && actual < 13);",
             "assert(assert._expr(assert._capt(assert._capt(5<assert._capt(actual,'ident',{start:{line:1,column:11}}),'binary',{start:{line:1,column:9}})&&assert._capt(assert._capt(actual,'ident',{start:{line:1,column:21}})<13,'binary',{start:{line:1,column:28}}),'logical',{start:{line:1,column:18}}),{start:{line:1,column:7}},'assert(5 < actual && actual < 13);'));");

        inst("assert.ok(actual < 5 || 13 < actual);",
             "assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(actual,'ident',{start:{line:1,column:10}})<5,'binary',{start:{line:1,column:17}})||assert._capt(13<assert._capt(actual,'ident',{start:{line:1,column:29}}),'binary',{start:{line:1,column:27}}),'logical',{start:{line:1,column:21}}),{start:{line:1,column:10}},'assert.ok(actual < 5 || 13 < actual);'));");

        inst("assert(2 > actual && actual < 13);",
             "assert(assert._expr(assert._capt(assert._capt(2>assert._capt(actual,'ident',{start:{line:1,column:11}}),'binary',{start:{line:1,column:9}})&&assert._capt(assert._capt(actual,'ident',{start:{line:1,column:21}})<13,'binary',{start:{line:1,column:28}}),'logical',{start:{line:1,column:18}}),{start:{line:1,column:7}},'assert(2 > actual && actual < 13);'));");
    });


    describe('MemberExpression', function () {
        inst("assert(foo.bar.baz);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(foo,'ident',{start:{line:1,column:7}}).bar,'ident',{start:{line:1,column:11}}).baz,'ident',{start:{line:1,column:15}}),{start:{line:1,column:7}},'assert(foo.bar.baz);'));");

        inst("assert(foo.bar);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'ident',{start:{line:1,column:7}}).bar,'ident',{start:{line:1,column:11}}),{start:{line:1,column:7}},'assert(foo.bar);'));");

        inst("assert(foo['bar']);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'ident',{start:{line:1,column:7}})['bar'],'ident',{start:{line:1,column:10}}),{start:{line:1,column:7}},'assert(foo[\\'bar\\']);'));");

        inst("assert(foo[propName]);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'ident',{start:{line:1,column:7}})[assert._capt(propName,'ident',{start:{line:1,column:11}})],'ident',{start:{line:1,column:10}}),{start:{line:1,column:7}},'assert(foo[propName]);'));");

        inst("assert(foo[func(key)]);",
             "assert(assert._expr(assert._capt(assert._capt(foo,'ident',{start:{line:1,column:7}})[assert._capt(func(assert._capt(key,'ident',{start:{line:1,column:16}})),'funcall',{start:{line:1,column:11}})],'ident',{start:{line:1,column:10}}),{start:{line:1,column:7}},'assert(foo[func(key)]);'));");

        inst("assert(foo[propName]['key'][keys()['name']]);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(assert._capt(foo,'ident',{start:{line:1,column:7}})[assert._capt(propName,'ident',{start:{line:1,column:11}})],'ident',{start:{line:1,column:10}})['key'],'ident',{start:{line:1,column:20}})[assert._capt(assert._capt(keys(),'funcall',{start:{line:1,column:28}})['name'],'ident',{start:{line:1,column:34}})],'ident',{start:{line:1,column:27}}),{start:{line:1,column:7}},'assert(foo[propName][\\'key\\'][keys()[\\'name\\']]);'));");
    });


    describe('CallExpression', function () {
        inst("assert(func());",
             "assert(assert._expr(assert._capt(func(),'funcall',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(func());'));");

        inst("assert(obj.age());",
             "assert(assert._expr(assert._capt(assert._capt(obj,'ident',{start:{line:1,column:7}}).age(),'funcall',{start:{line:1,column:11}}),{start:{line:1,column:7}},'assert(obj.age());'));");

        inst("assert(isFalsy(positiveInt));",
             "assert(assert._expr(assert._capt(isFalsy(assert._capt(positiveInt,'ident',{start:{line:1,column:15}})),'funcall',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(isFalsy(positiveInt));'));");

        inst("assert(sum(one, two, three) === seven);",
             "assert(assert._expr(assert._capt(assert._capt(sum(assert._capt(one,'ident',{start:{line:1,column:11}}),assert._capt(two,'ident',{start:{line:1,column:16}}),assert._capt(three,'ident',{start:{line:1,column:21}})),'funcall',{start:{line:1,column:7}})===assert._capt(seven,'ident',{start:{line:1,column:32}}),'binary',{start:{line:1,column:28}}),{start:{line:1,column:7}},'assert(sum(one, two, three) === seven);'));");

        inst("assert(sum(sum(one, two), three) === sum(sum(two, three), seven));",
             "assert(assert._expr(assert._capt(assert._capt(sum(assert._capt(sum(assert._capt(one,'ident',{start:{line:1,column:15}}),assert._capt(two,'ident',{start:{line:1,column:20}})),'funcall',{start:{line:1,column:11}}),assert._capt(three,'ident',{start:{line:1,column:26}})),'funcall',{start:{line:1,column:7}})===assert._capt(sum(assert._capt(sum(assert._capt(two,'ident',{start:{line:1,column:45}}),assert._capt(three,'ident',{start:{line:1,column:50}})),'funcall',{start:{line:1,column:41}}),assert._capt(seven,'ident',{start:{line:1,column:58}})),'funcall',{start:{line:1,column:37}}),'binary',{start:{line:1,column:33}}),{start:{line:1,column:7}},'assert(sum(sum(one, two), three) === sum(sum(two, three), seven));'));");

        inst("assert(math.calc.sum(one, two, three) === seven);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(assert._capt(math,'ident',{start:{line:1,column:7}}).calc,'ident',{start:{line:1,column:12}}).sum(assert._capt(one,'ident',{start:{line:1,column:21}}),assert._capt(two,'ident',{start:{line:1,column:26}}),assert._capt(three,'ident',{start:{line:1,column:31}})),'funcall',{start:{line:1,column:17}})===assert._capt(seven,'ident',{start:{line:1,column:42}}),'binary',{start:{line:1,column:38}}),{start:{line:1,column:7}},'assert(math.calc.sum(one, two, three) === seven);'));");

        inst("assert((three * (seven * ten)) === three);",
             "assert(assert._expr(assert._capt(assert._capt(assert._capt(three,'ident',{start:{line:1,column:8}})*assert._capt(assert._capt(seven,'ident',{start:{line:1,column:17}})*assert._capt(ten,'ident',{start:{line:1,column:25}}),'binary',{start:{line:1,column:23}}),'binary',{start:{line:1,column:14}})===assert._capt(three,'ident',{start:{line:1,column:35}}),'binary',{start:{line:1,column:31}}),{start:{line:1,column:7}},'assert((three * (seven * ten)) === three);'));");

        inst("assert(!concat(fuga, piyo));",
             "assert(assert._expr(assert._capt(!assert._capt(concat(assert._capt(fuga,'ident',{start:{line:1,column:15}}),assert._capt(piyo,'ident',{start:{line:1,column:21}})),'funcall',{start:{line:1,column:8}}),'unary',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(!concat(fuga, piyo));'));");
    });


    describe('AssignmentExpression', function () {
        inst("assert(counter += 1);",
             "assert(assert._expr(assert._capt(counter+=1,'assignment',{start:{line:1,column:15}}),{start:{line:1,column:7}},'assert(counter += 1);'));");

        inst("assert(dog.age += 1);",
             "assert(assert._expr(assert._capt(dog.age+=1,'assignment',{start:{line:1,column:15}}),{start:{line:1,column:7}},'assert(dog.age += 1);'));");
    });


    describe('ArrayExpression', function () {
        inst("assert([foo, bar]);",
             "assert(assert._expr([assert._capt(foo,'ident',{start:{line:1,column:8}}),assert._capt(bar,'ident',{start:{line:1,column:13}})],{start:{line:1,column:7}},'assert([foo, bar]);'));");

        inst("assert(typeof [[foo.bar, baz(moo)], + fourStr] === 'number');",
             "assert(assert._expr(assert._capt(assert._capt(typeof[[assert._capt(assert._capt(foo,'ident',{start:{line:1,column:16}}).bar,'ident',{start:{line:1,column:20}}),assert._capt(baz(assert._capt(moo,'ident',{start:{line:1,column:29}})),'funcall',{start:{line:1,column:25}})],assert._capt(+assert._capt(fourStr,'ident',{start:{line:1,column:38}}),'unary',{start:{line:1,column:36}})],'unary',{start:{line:1,column:7}})==='number','binary',{start:{line:1,column:47}}),{start:{line:1,column:7}},'assert(typeof [[foo.bar, baz(moo)], + fourStr] === \\'number\\');'));");
    });


    describe('UpdateExpression', function () {
        inst("assert(++foo);",
             "assert(assert._expr(assert._capt(++foo,'update',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(++foo);'));");

        inst("assert(bar--);",
             "assert(assert._expr(assert._capt(bar--,'update',{start:{line:1,column:7}}),{start:{line:1,column:7}},'assert(bar--);'));");
    });


    describe('ConditionalExpression', function () {
        inst("assert(foo ? bar : baz);",
             "assert(assert._expr(assert._capt(foo,'ident',{start:{line:1,column:7}})?assert._capt(bar,'ident',{start:{line:1,column:13}}):assert._capt(baz,'ident',{start:{line:1,column:19}}),{start:{line:1,column:7}},'assert(foo ? bar : baz);'));");

        inst("assert(falsy ? truthy : truthy ? anotherFalsy : truthy);",
             "assert(assert._expr(assert._capt(falsy,'ident',{start:{line:1,column:7}})?assert._capt(truthy,'ident',{start:{line:1,column:15}}):assert._capt(truthy,'ident',{start:{line:1,column:24}})?assert._capt(anotherFalsy,'ident',{start:{line:1,column:33}}):assert._capt(truthy,'ident',{start:{line:1,column:48}}),{start:{line:1,column:7}},'assert(falsy ? truthy : truthy ? anotherFalsy : truthy);'));");

        inst("assert(foo() ? bar.baz : (typeof goo));",
             "assert(assert._expr(assert._capt(foo(),'funcall',{start:{line:1,column:7}})?assert._capt(assert._capt(bar,'ident',{start:{line:1,column:15}}).baz,'ident',{start:{line:1,column:19}}):assert._capt(typeof goo,'unary',{start:{line:1,column:26}}),{start:{line:1,column:7}},'assert(foo() ? bar.baz : (typeof goo));'));");
    });


    describe('RegularExpression will not be instrumented', function () {
        inst("assert(/^not/.exec(str));",
             "assert(assert._expr(assert._capt(/^not/.exec(assert._capt(str,'ident',{start:{line:1,column:19}})),'funcall',{start:{line:1,column:14}}),{start:{line:1,column:7}},'assert(/^not/.exec(str));'));");
    });

});
