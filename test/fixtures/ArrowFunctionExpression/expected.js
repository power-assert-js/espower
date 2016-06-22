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
assert(v => v + 1);
assert((v, i) => v + i);
assert(v => ({
    even: v,
    odd: v + 1
}));
assert(_rec1._expr(_rec1._capt(_rec1._capt(seven, 'arguments/0/left') === _rec1._capt(((v, i) => v + i)(_rec1._capt(four, 'arguments/0/right/arguments/0'), _rec1._capt(five, 'arguments/0/right/arguments/1')), 'arguments/0/right'), 'arguments/0'), {
    content: 'assert(seven === ((v, i) => v + i)(four, five))',
    filepath: 'path/to/some_test.js',
    line: 9
}));
