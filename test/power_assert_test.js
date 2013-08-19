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
            var espoweredAST = espower(jsAST, options);
            var instrumentedCode = escodegen.generate(espoweredAST, {format: {compact: true}});
            assert.equal(instrumentedCode, expected);
        });
    }


    // questionable
    inst("assert(delete foo.bar);",
         "assert(assert.expr(delete assert.capture(assert.capture(foo,'ident',{start:{line:1,column:14}}).bar,'ident',{start:{line:1,column:18}}),{start:{line:1,column:7}}));");



    inst("assert(falsyStr);",
         "assert(assert.expr(assert.capture(falsyStr,'ident',{start:{line:1,column:7}}),{start:{line:1,column:7}}));");

    inst("assert.ok(hoge === fuga, 'comment');",
         "assert.ok(assert.expr(assert.capture(assert.capture(hoge,'ident',{start:{line:1,column:10}})===assert.capture(fuga,'ident',{start:{line:1,column:19}}),'binary',{start:{line:1,column:15}}),{start:{line:1,column:10}}),'comment');");

    inst("return assert(falsyStr);",
         "return assert(assert.expr(assert.capture(falsyStr,'ident',{start:{line:1,column:14}}),{start:{line:1,column:14}}));");

    inst("assert(!truth);",
         "assert(assert.expr(!assert.capture(truth,'ident',{start:{line:1,column:8}}),{start:{line:1,column:7}}));");

    inst("assert(!!some);",
         "assert(assert.expr(!!assert.capture(some,'ident',{start:{line:1,column:9}}),{start:{line:1,column:7}}));");
    
    inst("assert(4 !== 4);",
         "assert(assert.expr(assert.capture(4!==4,'binary',{start:{line:1,column:9}}),{start:{line:1,column:7}}));");

    inst("assert(fuga !== 4);",
         "assert(assert.expr(assert.capture(assert.capture(fuga,'ident',{start:{line:1,column:7}})!==4,'binary',{start:{line:1,column:12}}),{start:{line:1,column:7}}));");

    inst("assert(fuga === piyo);",
         "assert(assert.expr(assert.capture(assert.capture(fuga,'ident',{start:{line:1,column:7}})===assert.capture(piyo,'ident',{start:{line:1,column:16}}),'binary',{start:{line:1,column:12}}),{start:{line:1,column:7}}));");

    inst("assert(fuga !== piyo);",
         "assert(assert.expr(assert.capture(assert.capture(fuga,'ident',{start:{line:1,column:7}})!==assert.capture(piyo,'ident',{start:{line:1,column:16}}),'binary',{start:{line:1,column:12}}),{start:{line:1,column:7}}));");

    inst("assert(typeof foo !== 'undefined');",
         "assert(assert.expr(assert.capture(typeof foo!=='undefined','binary',{start:{line:1,column:18}}),{start:{line:1,column:7}}));");

    inst("assert(typeof foo.bar !== 'undefined');",
         "assert(assert.expr(assert.capture(typeof foo.bar!=='undefined','binary',{start:{line:1,column:22}}),{start:{line:1,column:7}}));");

    inst("assert(ary1.length === ary2.length);",
         "assert(assert.expr(assert.capture(assert.capture(assert.capture(ary1,'ident',{start:{line:1,column:7}}).length,'ident',{start:{line:1,column:12}})===assert.capture(assert.capture(ary2,'ident',{start:{line:1,column:23}}).length,'ident',{start:{line:1,column:28}}),'binary',{start:{line:1,column:19}}),{start:{line:1,column:7}}));");

    inst("assert(5 < actual && actual < 13);",
         "assert(assert.expr(assert.capture(5<assert.capture(actual,'ident',{start:{line:1,column:11}}),'binary',{start:{line:1,column:9}})&&assert.capture(assert.capture(actual,'ident',{start:{line:1,column:21}})<13,'binary',{start:{line:1,column:28}}),{start:{line:1,column:7}}));");

    inst("assert.ok(actual < 5 || 13 < actual);",
         "assert.ok(assert.expr(assert.capture(assert.capture(actual,'ident',{start:{line:1,column:10}})<5,'binary',{start:{line:1,column:17}})||assert.capture(13<assert.capture(actual,'ident',{start:{line:1,column:29}}),'binary',{start:{line:1,column:27}}),{start:{line:1,column:10}}));");

    inst("assert(2 > actual && actual < 13);",
         "assert(assert.expr(assert.capture(2>assert.capture(actual,'ident',{start:{line:1,column:11}}),'binary',{start:{line:1,column:9}})&&assert.capture(assert.capture(actual,'ident',{start:{line:1,column:21}})<13,'binary',{start:{line:1,column:28}}),{start:{line:1,column:7}}));");

    inst("assert(foo.bar.baz);",
         "assert(assert.expr(assert.capture(assert.capture(assert.capture(foo,'ident',{start:{line:1,column:7}}).bar,'ident',{start:{line:1,column:11}}).baz,'ident',{start:{line:1,column:15}}),{start:{line:1,column:7}}));");

    inst("assert(func());",
         "assert(assert.expr(assert.capture(func(),'funcall',{start:{line:1,column:7}}),{start:{line:1,column:7}}));");

    inst("assert(obj.age());",
         "assert(assert.expr(assert.capture(assert.capture(obj,'ident',{start:{line:1,column:7}}).age(),'funcall',{start:{line:1,column:11}}),{start:{line:1,column:7}}));");

    inst("assert(isFalsy(positiveInt));",
         "assert(assert.expr(assert.capture(isFalsy(assert.capture(positiveInt,'ident',{start:{line:1,column:15}})),'funcall',{start:{line:1,column:7}}),{start:{line:1,column:7}}));");

    inst("assert(sum(one, two, three) === seven);",
         "assert(assert.expr(assert.capture(assert.capture(sum(assert.capture(one,'ident',{start:{line:1,column:11}}),assert.capture(two,'ident',{start:{line:1,column:16}}),assert.capture(three,'ident',{start:{line:1,column:21}})),'funcall',{start:{line:1,column:7}})===assert.capture(seven,'ident',{start:{line:1,column:32}}),'binary',{start:{line:1,column:28}}),{start:{line:1,column:7}}));");

    inst("assert(sum(sum(one, two), three) === sum(sum(two, three), seven));",
         "assert(assert.expr(assert.capture(assert.capture(sum(assert.capture(sum(assert.capture(one,'ident',{start:{line:1,column:15}}),assert.capture(two,'ident',{start:{line:1,column:20}})),'funcall',{start:{line:1,column:11}}),assert.capture(three,'ident',{start:{line:1,column:26}})),'funcall',{start:{line:1,column:7}})===assert.capture(sum(assert.capture(sum(assert.capture(two,'ident',{start:{line:1,column:45}}),assert.capture(three,'ident',{start:{line:1,column:50}})),'funcall',{start:{line:1,column:41}}),assert.capture(seven,'ident',{start:{line:1,column:58}})),'funcall',{start:{line:1,column:37}}),'binary',{start:{line:1,column:33}}),{start:{line:1,column:7}}));");

    inst("assert(math.calc.sum(one, two, three) === seven);",
         "assert(assert.expr(assert.capture(assert.capture(assert.capture(assert.capture(math,'ident',{start:{line:1,column:7}}).calc,'ident',{start:{line:1,column:12}}).sum(assert.capture(one,'ident',{start:{line:1,column:21}}),assert.capture(two,'ident',{start:{line:1,column:26}}),assert.capture(three,'ident',{start:{line:1,column:31}})),'funcall',{start:{line:1,column:17}})===assert.capture(seven,'ident',{start:{line:1,column:42}}),'binary',{start:{line:1,column:38}}),{start:{line:1,column:7}}));");

    inst("assert((three * (seven * ten)) === three);",
         "assert(assert.expr(assert.capture(assert.capture(assert.capture(three,'ident',{start:{line:1,column:8}})*assert.capture(assert.capture(seven,'ident',{start:{line:1,column:17}})*assert.capture(ten,'ident',{start:{line:1,column:25}}),'binary',{start:{line:1,column:23}}),'binary',{start:{line:1,column:14}})===assert.capture(three,'ident',{start:{line:1,column:35}}),'binary',{start:{line:1,column:30}}),{start:{line:1,column:7}}));");

    inst("assert(!concat(fuga, piyo));",
         "assert(assert.expr(!assert.capture(concat(assert.capture(fuga,'ident',{start:{line:1,column:15}}),assert.capture(piyo,'ident',{start:{line:1,column:21}})),'funcall',{start:{line:1,column:8}}),{start:{line:1,column:7}}));");
});
