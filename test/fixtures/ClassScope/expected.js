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
const assert = require('assert');
class Dog {
    say() {
        return 'bow';
    }
}
const d = new Dog();
assert(_rec1._expr(_rec1._capt(_rec1._capt(d, 'arguments/0/callee/object').say(), 'arguments/0'), {
    content: 'assert(d.say())',
    filepath: 'path/to/some_test.js',
    line: 12
}));
