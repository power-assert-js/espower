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
assert(false);
assert(0);
assert.equal(1, 0);
assert(false, 'message');
assert(false, messageStr);
assert.equal(_rec1._expr(_rec1._capt(foo, 'arguments/0'), {
    content: 'assert.equal(foo, \'bar\', \'msg\')',
    filepath: 'path/to/some_test.js',
    line: 13
}), 'bar', 'msg');
assert(_rec2._expr(_rec2._capt(/^not/.exec(_rec2._capt(str, 'arguments/0/arguments/0')), 'arguments/0'), {
    content: 'assert(/^not/.exec(str))',
    filepath: 'path/to/some_test.js',
    line: 16
}));
assert(_rec3._expr(_rec3._capt(_rec3._capt(fuga, 'arguments/0/left') !== 'ふが', 'arguments/0'), {
    content: 'assert(fuga !== \'ふが\')',
    filepath: 'path/to/some_test.js',
    line: 19
}));
assert(_rec4._expr(_rec4._capt('ほげ' !== 'ふが', 'arguments/0'), {
    content: 'assert(\'ほげ\' !== \'ふが\')',
    filepath: 'path/to/some_test.js',
    line: 20
}));
assert(503);
assert(503);
