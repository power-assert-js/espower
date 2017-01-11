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
        var capturedValues = this.captured;
        this.captured = [];
        return {
            powerAssertContext: {
                value: value,
                events: capturedValues
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
assert(_rec1._expr(_rec1._capt(++foo, 'arguments/0'), {
    content: 'assert(++foo)',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(_rec2._expr(_rec2._capt(bar--, 'arguments/0'), {
    content: 'assert(bar--)',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert.strictEqual(_rec3._expr(_rec3._capt(++foo, 'arguments/0'), {
    content: 'assert.strictEqual(++foo, bar--)',
    filepath: 'path/to/some_test.js',
    line: 7
}), _rec4._expr(_rec4._capt(bar--, 'arguments/1'), {
    content: 'assert.strictEqual(++foo, bar--)',
    filepath: 'path/to/some_test.js',
    line: 7
}));
