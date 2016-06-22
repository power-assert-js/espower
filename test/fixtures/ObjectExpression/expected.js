'use strict';
var _PowerAssertRecorder1 = function () {
    function PowerAssertRecorder() {
        this.captured = [];
    }
    PowerAssertRecorder.prototype._capt = function _capt(value, espath) {
        this.captured.push({
            value: value,
            espath: espath
        });
        return value;
    };
    PowerAssertRecorder.prototype._expr = function _expr(value, source) {
        return {
            powerAssertContext: {
                value: value,
                events: this.captured
            },
            source: source
        };
    };
    return PowerAssertRecorder;
}();
var _rec1 = new _PowerAssertRecorder1();
var _rec2 = new _PowerAssertRecorder1();
var _rec3 = new _PowerAssertRecorder1();
var _rec4 = new _PowerAssertRecorder1();
assert(_rec1._expr(_rec1._capt({
    foo: _rec1._capt(bar, 'arguments/0/properties/0/value'),
    hoge: _rec1._capt(fuga, 'arguments/0/properties/1/value')
}, 'arguments/0'), {
    content: 'assert({foo: bar,hoge: fuga})',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(_rec2._expr(_rec2._capt(!_rec2._capt({
    foo: _rec2._capt(_rec2._capt(bar, 'arguments/0/argument/properties/0/value/object').baz, 'arguments/0/argument/properties/0/value'),
    name: _rec2._capt(nameOf(_rec2._capt({
        firstName: _rec2._capt(first, 'arguments/0/argument/properties/1/value/arguments/0/properties/0/value'),
        lastName: _rec2._capt(last, 'arguments/0/argument/properties/1/value/arguments/0/properties/1/value')
    }, 'arguments/0/argument/properties/1/value/arguments/0')), 'arguments/0/argument/properties/1/value')
}, 'arguments/0/argument'), 'arguments/0'), {
    content: 'assert(!{foo: bar.baz,name: nameOf({firstName: first,lastName: last})})',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert.deepEqual(_rec3._expr(_rec3._capt({
    foo: _rec3._capt(bar, 'arguments/0/properties/0/value'),
    hoge: _rec3._capt(fuga, 'arguments/0/properties/1/value')
}, 'arguments/0'), {
    content: 'assert.deepEqual({foo: bar,hoge: fuga}, {hoge: fuga,foo: bar})',
    filepath: 'path/to/some_test.js',
    line: 7
}), _rec4._expr(_rec4._capt({
    hoge: _rec4._capt(fuga, 'arguments/1/properties/0/value'),
    foo: _rec4._capt(bar, 'arguments/1/properties/1/value')
}, 'arguments/1'), {
    content: 'assert.deepEqual({foo: bar,hoge: fuga}, {hoge: fuga,foo: bar})',
    filepath: 'path/to/some_test.js',
    line: 7
}));
