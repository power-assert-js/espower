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
assert(_rec1._expr(_rec1._capt(new Date(), 'arguments/0'), {
    content: 'assert(new Date())',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(_rec2._expr(_rec2._capt(new (_rec2._capt(_rec2._capt(foo, 'arguments/0/callee/object/object').bar, 'arguments/0/callee/object')).Baz(), 'arguments/0'), {
    content: 'assert(new foo.bar.Baz())',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert(_rec3._expr(_rec3._capt(!_rec3._capt(new Array(_rec3._capt(foo, 'arguments/0/argument/arguments/0'), _rec3._capt(bar, 'arguments/0/argument/arguments/1'), _rec3._capt(baz, 'arguments/0/argument/arguments/2')), 'arguments/0/argument'), 'arguments/0'), {
    content: 'assert(!new Array(foo, bar, baz))',
    filepath: 'path/to/some_test.js',
    line: 7
}));
assert.notEqual(_rec4._expr(_rec4._capt(new Date(), 'arguments/0'), {
    content: 'assert.notEqual(new Date(), new Date(\'2013-01-12\'))',
    filepath: 'path/to/some_test.js',
    line: 9
}), _rec5._expr(_rec5._capt(new Date('2013-01-12'), 'arguments/1'), {
    content: 'assert.notEqual(new Date(), new Date(\'2013-01-12\'))',
    filepath: 'path/to/some_test.js',
    line: 9
}));
