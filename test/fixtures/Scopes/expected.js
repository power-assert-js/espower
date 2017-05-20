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
var assert = require('assert');
for (var i = 0; i < 3; i += 1) {
    if (foo) {
        assert(_rec1._expr(_rec1._capt(_rec1._capt(foo, 'arguments/0/left') === 'FOO', 'arguments/0'), {
            content: 'assert(foo === \'FOO\')',
            filepath: 'path/to/some_test.js',
            line: 5
        }));
    } else {
        assert(_rec2._expr(_rec2._capt(bar, 'arguments/0'), {
            content: 'assert(bar)',
            filepath: 'path/to/some_test.js',
            line: 7
        }));
    }
}
