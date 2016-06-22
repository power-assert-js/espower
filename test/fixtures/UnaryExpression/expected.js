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
var _rec6 = new _PowerAssertRecorder1();
var _rec7 = new _PowerAssertRecorder1();
var _rec8 = new _PowerAssertRecorder1();
assert(_rec1._expr(_rec1._capt(!_rec1._capt(truth, 'arguments/0/argument'), 'arguments/0'), {
    content: 'assert(!truth)',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(_rec2._expr(_rec2._capt(!_rec2._capt(!_rec2._capt(some, 'arguments/0/argument/argument'), 'arguments/0/argument'), 'arguments/0'), {
    content: 'assert(!!some)',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert(_rec3._expr(_rec3._capt(!_rec3._capt(!_rec3._capt(_rec3._capt(foo, 'arguments/0/argument/argument/object').bar, 'arguments/0/argument/argument'), 'arguments/0/argument'), 'arguments/0'), {
    content: 'assert(!!foo.bar)',
    filepath: 'path/to/some_test.js',
    line: 7
}));
assert(_rec4._expr(_rec4._capt(delete _rec4._capt(_rec4._capt(foo, 'arguments/0/argument/object').bar, 'arguments/0/argument'), 'arguments/0'), {
    content: 'assert(delete foo.bar)',
    filepath: 'path/to/some_test.js',
    line: 9
}));
assert(_rec5._expr(_rec5._capt(_rec5._capt(typeof foo, 'arguments/0/left') !== 'undefined', 'arguments/0'), {
    content: 'assert(typeof foo !== \'undefined\')',
    filepath: 'path/to/some_test.js',
    line: 11
}));
assert(_rec6._expr(_rec6._capt(_rec6._capt(typeof _rec6._capt(_rec6._capt(foo, 'arguments/0/left/argument/object').bar, 'arguments/0/left/argument'), 'arguments/0/left') !== 'undefined', 'arguments/0'), {
    content: 'assert(typeof foo.bar !== \'undefined\')',
    filepath: 'path/to/some_test.js',
    line: 13
}));
assert.strictEqual(_rec7._expr(_rec7._capt(typeof foo, 'arguments/0'), {
    content: 'assert.strictEqual(typeof foo, typeof bar)',
    filepath: 'path/to/some_test.js',
    line: 15
}), _rec8._expr(_rec8._capt(typeof bar, 'arguments/1'), {
    content: 'assert.strictEqual(typeof foo, typeof bar)',
    filepath: 'path/to/some_test.js',
    line: 15
}));
