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
assert(function (a, b) {
    return a + b;
});
assert(_rec1._expr(_rec1._capt(_rec1._capt(baz, 'arguments/0/left') === _rec1._capt(function (a, b) {
    return a + b;
}(_rec1._capt(foo, 'arguments/0/right/arguments/0'), _rec1._capt(bar, 'arguments/0/right/arguments/1')), 'arguments/0/right'), 'arguments/0'), {
    content: 'assert(baz === function (a, b) {return a + b;}(foo, bar))',
    filepath: 'path/to/some_test.js',
    line: 6
}));
