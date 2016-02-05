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
var _rec5 = new _PowerAssertRecorder1();
assert(_rec1._expr(_rec1._capt({ [_rec1._capt(num, 'arguments/0/properties/0/key')]: _rec1._capt(foo, 'arguments/0/properties/0/value') }, 'arguments/0'), {
    content: 'assert({ [num]: foo })',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(_rec2._expr(_rec2._capt({ [_rec2._capt('prop_' + _rec2._capt((() => bar())(), 'arguments/0/properties/0/key/right'), 'arguments/0/properties/0/key')]: 42 }, 'arguments/0'), {
    content: 'assert({ [\'prop_\' + (() => bar())()]: 42 })',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert(_rec3._expr(_rec3._capt({ [_rec3._capt(`prop_${ _rec3._capt(generate(_rec3._capt(seed, 'arguments/0/properties/0/key/expressions/0/arguments/0')), 'arguments/0/properties/0/key/expressions/0') }`, 'arguments/0/properties/0/key')]: _rec3._capt(foo, 'arguments/0/properties/0/value') }, 'arguments/0'), {
    content: 'assert({ [`prop_${ generate(seed) }`]: foo })',
    filepath: 'path/to/some_test.js',
    line: 7
}));
assert(_rec4._expr(_rec4._capt({ foo }, 'arguments/0'), {
    content: 'assert({ foo })',
    filepath: 'path/to/some_test.js',
    line: 9
}));
assert(_rec5._expr(_rec5._capt({
    foo,
    bar: _rec5._capt(baz, 'arguments/0/properties/1/value')
}, 'arguments/0'), {
    content: 'assert({foo,bar: baz})',
    filepath: 'path/to/some_test.js',
    line: 11
}));
