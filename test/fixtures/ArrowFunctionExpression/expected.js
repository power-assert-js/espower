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
var _rec2 = new _PowerAssertRecorder1();
assert(v => v + 1);
assert((v, i) => v + i);
assert(v => ({
    even: v,
    odd: v + 1
}));
assert(_rec1._expr(_rec1._capt(_rec1._capt(seven, 'arguments/0/left') === _rec1._capt(((v, i) => v + i)(_rec1._capt(four, 'arguments/0/right/arguments/0'), _rec1._capt(five, 'arguments/0/right/arguments/1')), 'arguments/0/right'), 'arguments/0'), {
    content: 'assert(seven === ((v, i) => v + i)(four, five))',
    filepath: 'path/to/some_test.js',
    line: 10
}));
test('test name', () => assert(_rec2._expr(_rec2._capt(_rec2._capt(_rec2._capt(user, 'arguments/0/left/object').name, 'arguments/0/left') === 'Bob', 'arguments/0'), {
    content: 'assert(user.name === \'Bob\')',
    filepath: 'path/to/some_test.js',
    line: 12
})));
test('promise', () => {
    var _rec3 = new _PowerAssertRecorder1();
    return Promise.resolve().then(() => assert(_rec3._expr(_rec3._capt(true === false, 'arguments/0'), {
        content: 'assert(true === false)',
        filepath: 'path/to/some_test.js',
        line: 15
    })));
});
