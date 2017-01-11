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
var _rec5 = new _PowerAssertRecorder1();
var _rec6 = new _PowerAssertRecorder1();
var _rec7 = new _PowerAssertRecorder1();
assert(_rec1._expr(_rec1._capt(counter += 1, 'arguments/0'), {
    content: 'assert(counter += 1)',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(_rec2._expr(_rec2._capt(dog.age += 1, 'arguments/0'), {
    content: 'assert(dog.age += 1)',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert(_rec3._expr(_rec3._capt(dog.age += 1, 'arguments/0'), {
    content: 'assert(dog.age += 1)',
    filepath: 'path/to/some_test.js',
    line: 7
}));
assert.strictEqual(_rec4._expr(_rec4._capt(dog.age += 1, 'arguments/0'), {
    content: 'assert.strictEqual(dog.age += 1, three)',
    filepath: 'path/to/some_test.js',
    line: 9
}), _rec5._expr(_rec5._capt(three, 'arguments/1'), {
    content: 'assert.strictEqual(dog.age += 1, three)',
    filepath: 'path/to/some_test.js',
    line: 9
}));
assert(_rec6._expr(_rec6._capt([x] = _rec6._capt([3], 'arguments/0/right'), 'arguments/0'), {
    content: 'assert([x] = [3])',
    filepath: 'path/to/some_test.js',
    line: 12
}));
assert(_rec7._expr(_rec7._capt([x] = _rec7._capt([_rec7._capt(foo, 'arguments/0/right/elements/0')], 'arguments/0/right'), 'arguments/0'), {
    content: 'assert([x] = [foo])',
    filepath: 'path/to/some_test.js',
    line: 14
}));
