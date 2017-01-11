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
var assert = require('power-assert');
describe('Array#indexOf()', function () {
    beforeEach(function () {
        this.ary = [
            1,
            2,
            3
        ];
    });
    it('should return index when the value is present', function () {
        var _rec1 = new _PowerAssertRecorder1();
        var who = 'ariya', two = 2;
        assert(_rec1._expr(_rec1._capt(_rec1._capt(_rec1._capt(this.ary, 'arguments/0/left/callee/object').indexOf(_rec1._capt(who, 'arguments/0/left/arguments/0')), 'arguments/0/left') === _rec1._capt(two, 'arguments/0/right'), 'arguments/0'), {
            content: 'assert(this.ary.indexOf(who) === two)',
            filepath: 'path/to/some_test.js',
            line: 11
        }));
    });
    it('should return -1 when the value is not present', function () {
        var _rec2 = new _PowerAssertRecorder1();
        var minusOne = -1, two = 2;
        assert.ok(_rec2._expr(_rec2._capt(_rec2._capt(_rec2._capt(this.ary, 'arguments/0/left/callee/object').indexOf(_rec2._capt(two, 'arguments/0/left/arguments/0')), 'arguments/0/left') === _rec2._capt(minusOne, 'arguments/0/right'), 'arguments/0'), {
            content: 'assert.ok(this.ary.indexOf(two) === minusOne, \'THIS IS AN ASSERTION MESSAGE\')',
            filepath: 'path/to/some_test.js',
            line: 15
        }), 'THIS IS AN ASSERTION MESSAGE');
    });
});
