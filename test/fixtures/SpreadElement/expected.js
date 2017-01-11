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
assert(_rec1._expr(_rec1._capt(hello(..._rec1._capt(names, 'arguments/0/arguments/0/argument')), 'arguments/0'), {
    content: 'assert(hello(...names))',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(_rec2._expr(_rec2._capt(_rec2._capt([
    _rec2._capt(head, 'arguments/0/object/elements/0'),
    ..._rec2._capt(tail, 'arguments/0/object/elements/1/argument')
], 'arguments/0/object').length, 'arguments/0'), {
    content: 'assert([head,...tail].length)',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert(_rec3._expr(_rec3._capt(f(_rec3._capt(head, 'arguments/0/arguments/0'), ..._rec3._capt(iter(), 'arguments/0/arguments/1/argument'), ..._rec3._capt([
    _rec3._capt(foo, 'arguments/0/arguments/2/argument/elements/0'),
    _rec3._capt(bar, 'arguments/0/arguments/2/argument/elements/1')
], 'arguments/0/arguments/2/argument')), 'arguments/0'), {
    content: 'assert(f(head, ...iter(), ...[foo,bar]))',
    filepath: 'path/to/some_test.js',
    line: 7
}));
