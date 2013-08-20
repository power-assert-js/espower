var espower = require('../lib/espower'),
    CoffeeScript = require('coffee-script-redux'),
    assert = require('assert');

describe('CoffeeScriptRedux learning & spike', function () {

    it('with CoffeeScriptRedux toolchain', function () {
        var csCode = 'assert.ok dog.speak() == says';

        var parseOptions = {raw: true};
        var csAST = CoffeeScript.parse(csCode, parseOptions);

        var compileOptions = {bare: false};
        var jsAST = CoffeeScript.compile(csAST, compileOptions);

        var espoweredAst = espower(jsAST, {destructive: false, source: csCode, path: '/path/to/foo_test.coffee', powerAssertVariableName: 'assert'});

        var jsGenerateOptions = {compact: true};
        var jsCode = CoffeeScript.js(espoweredAst, jsGenerateOptions);

        assert.equal(jsCode, "assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(dog,'ident',{start:{line:1,column:10}}).speak(),'funcall',{start:{line:1,column:14}})===assert._capt(says,'ident',{start:{line:1,column:25}}),'binary',{start:{line:1,column:22}}),{start:{line:1,column:10},path:'/path/to/foo_test.coffee'},'assert.ok dog.speak() == says'))");
    });
});
