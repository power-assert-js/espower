var espower = require('../lib/espower'),
    CoffeeScript = require('coffee-script-redux'),
    assert = require('assert');

describe('CoffeeScriptRedux learning & spike', function () {

    it('with CoffeeScriptRedux toolchain', function () {
        var csCode = 'assert.ok dog.age is three',
            csAST = CoffeeScript.parse(csCode, {raw: true}),
            jsAST = CoffeeScript.compile(csAST, {bare: false}),
            espoweredAst = espower(jsAST, {destructive: false, source: csCode, path: '/path/to/foo_test.coffee', powerAssertVariableName: 'assert'}),
            jsCode = CoffeeScript.js(espoweredAst, {compact: true});
        assert.equal(jsCode, "assert.ok(assert._expr(assert._capt(assert._capt(assert._capt(dog,'ident',{start:{line:1,column:10}}).age,'ident',{start:{line:1,column:14}})===assert._capt(three,'ident',{start:{line:1,column:21}}),'binary',{start:{line:1,column:18}}),{start:{line:1,column:10},path:'/path/to/foo_test.coffee'},'assert.ok dog.age is three'))");
    });
});
