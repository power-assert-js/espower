var _rec = new _powerAssertRecorder();
var _rec = new _powerAssertRecorder();
var _rec = new _powerAssertRecorder();
var _rec = new _powerAssertRecorder();
var _rec = new _powerAssertRecorder();
var _rec = new _powerAssertRecorder();
var _rec = new _powerAssertRecorder();
var _rec = new _powerAssertRecorder();
var _rec = new _powerAssertRecorder();
var _rec = new _powerAssertRecorder();
var _rec = new _powerAssertRecorder();
var _rec = new _powerAssertRecorder();
'use strict';
assert(_rec._expr(_rec._capt(falsyStr, 'arguments/0'), {
    content: 'assert(falsyStr)',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(_rec._expr(_rec._capt(falsyStr, 'arguments/0'), {
    content: 'assert(falsyStr, messageStr)',
    filepath: 'path/to/some_test.js',
    line: 5
}), messageStr);
assert.equal(_rec._expr(_rec._capt(str, 'arguments/0'), {
    content: 'assert.equal(str, anotherStr)',
    filepath: 'path/to/some_test.js',
    line: 7
}), _rec._expr(_rec._capt(anotherStr, 'arguments/1'), {
    content: 'assert.equal(str, anotherStr)',
    filepath: 'path/to/some_test.js',
    line: 7
}));
assert.equal(_rec._expr(_rec._capt(str, 'arguments/0'), {
    content: 'assert.equal(str, anotherStr)',
    filepath: 'path/to/some_test.js',
    line: 9
}), _rec._expr(_rec._capt(anotherStr, 'arguments/1'), {
    content: 'assert.equal(str, anotherStr)',
    filepath: 'path/to/some_test.js',
    line: 9
}));
assert.equal(_rec._expr(_rec._capt(str, 'arguments/0'), {
    content: 'assert.equal(str, anotherStr, messageStr)',
    filepath: 'path/to/some_test.js',
    line: 14
}), _rec._expr(_rec._capt(anotherStr, 'arguments/1'), {
    content: 'assert.equal(str, anotherStr, messageStr)',
    filepath: 'path/to/some_test.js',
    line: 14
}), messageStr);
assert.equal(_rec._expr(_rec._capt(str, 'arguments/0'), {
    content: 'assert.equal(str, anotherStr)',
    filepath: 'path/to/some_test.js',
    line: 16
}), _rec._expr(_rec._capt(anotherStr, 'arguments/1'), {
    content: 'assert.equal(str, anotherStr)',
    filepath: 'path/to/some_test.js',
    line: 16
}));
assert.equal(_rec._expr(_rec._capt(str, 'arguments/0'), {
    content: 'assert.equal(str, yetAnotherStr)',
    filepath: 'path/to/some_test.js',
    line: 21
}), _rec._expr(_rec._capt(yetAnotherStr, 'arguments/1'), {
    content: 'assert.equal(str, yetAnotherStr)',
    filepath: 'path/to/some_test.js',
    line: 21
}));
