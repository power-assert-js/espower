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
function* gen(a) {
    var _rec1 = new _PowerAssertRecorder1();
    assert(_rec1._expr(_rec1._capt(_rec1._capt(yield a, 'arguments/0/left') === 3, 'arguments/0'), {
        content: 'assert((yield a) === 3)',
        filepath: 'path/to/some_test.js',
        line: 4,
        generator: true
    }));
}
