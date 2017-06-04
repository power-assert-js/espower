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
describe('Array', function () {
    beforeEach(function () {
        this.ary = [
            1,
            2,
            3
        ];
    });
    describe('#indexOf()', function () {
        it('should return index when the value is present', function () {
            var _rec1 = new _PowerAssertRecorder1();
            var who = 'ariya', two = 2;
            assert(_rec1._expr(_rec1._capt(_rec1._capt(_rec1._capt(this.ary, 'arguments/0/left/callee/object').indexOf(_rec1._capt(who, 'arguments/0/left/arguments/0')), 'arguments/0/left') === _rec1._capt(two, 'arguments/0/right'), 'arguments/0'), {
                content: 'assert(this.ary.indexOf(who) === two)',
                filepath: 'path/to/some_test.js',
                line: 12
            }));
        });
        it('should return -1 when the value is not present', function () {
            var _rec2 = new _PowerAssertRecorder1();
            var minusOne = -1, two = 2;
            assert.ok(_rec2._expr(_rec2._capt(_rec2._capt(_rec2._capt(this.ary, 'arguments/0/left/callee/object').indexOf(_rec2._capt(two, 'arguments/0/left/arguments/0')), 'arguments/0/left') === _rec2._capt(minusOne, 'arguments/0/right'), 'arguments/0'), {
                content: 'assert.ok(this.ary.indexOf(two) === minusOne, \'THIS IS AN ASSERTION MESSAGE\')',
                filepath: 'path/to/some_test.js',
                line: 16
            }), 'THIS IS AN ASSERTION MESSAGE');
        });
    });
    it('#length', function () {
        var _rec3 = new _PowerAssertRecorder1();
        var _rec4 = new _PowerAssertRecorder1();
        var four = 4;
        assert.equal(_rec3._expr(_rec3._capt(_rec3._capt(this.ary, 'arguments/0/object').length, 'arguments/0'), {
            content: 'assert.equal(this.ary.length, four)',
            filepath: 'path/to/some_test.js',
            line: 21
        }), _rec4._expr(_rec4._capt(four, 'arguments/1'), {
            content: 'assert.equal(this.ary.length, four)',
            filepath: 'path/to/some_test.js',
            line: 21
        }));
    });
    it('#length assertion with message', function () {
        var _rec5 = new _PowerAssertRecorder1();
        var _rec6 = new _PowerAssertRecorder1();
        var four = 4;
        assert.equal(_rec5._expr(_rec5._capt(_rec5._capt(this.ary, 'arguments/0/object').length, 'arguments/0'), {
            content: 'assert.equal(this.ary.length, four, \'THIS IS AN ASSERTION MESSAGE\')',
            filepath: 'path/to/some_test.js',
            line: 25
        }), _rec6._expr(_rec6._capt(four, 'arguments/1'), {
            content: 'assert.equal(this.ary.length, four, \'THIS IS AN ASSERTION MESSAGE\')',
            filepath: 'path/to/some_test.js',
            line: 25
        }), 'THIS IS AN ASSERTION MESSAGE');
    });
});
