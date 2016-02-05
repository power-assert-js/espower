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
async function myAsync(a) {
    assert(_rec1._expr(_rec1._capt(_rec1._capt(await a, 'arguments/0/left') === 3, 'arguments/0'), {
        content: 'assert((await a) === 3)',
        filepath: 'path/to/some_test.js',
        line: 4,
        async: true
    }));
}
