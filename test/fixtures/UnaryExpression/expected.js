'use strict';
assert(assert._expr(assert._capt(!assert._capt(truth, 'arguments/0/argument'), 'arguments/0'), {
    content: 'assert(!truth)',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(assert._expr(assert._capt(!assert._capt(!assert._capt(some, 'arguments/0/argument/argument'), 'arguments/0/argument'), 'arguments/0'), {
    content: 'assert(!!some)',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert(assert._expr(assert._capt(!assert._capt(!assert._capt(assert._capt(foo, 'arguments/0/argument/argument/object').bar, 'arguments/0/argument/argument'), 'arguments/0/argument'), 'arguments/0'), {
    content: 'assert(!!foo.bar)',
    filepath: 'path/to/some_test.js',
    line: 7
}));
assert(assert._expr(assert._capt(delete assert._capt(assert._capt(foo, 'arguments/0/argument/object').bar, 'arguments/0/argument'), 'arguments/0'), {
    content: 'assert(delete foo.bar)',
    filepath: 'path/to/some_test.js',
    line: 9
}));
assert(assert._expr(assert._capt(assert._capt(typeof foo, 'arguments/0/left') !== 'undefined', 'arguments/0'), {
    content: 'assert(typeof foo !== \'undefined\')',
    filepath: 'path/to/some_test.js',
    line: 11
}));
assert(assert._expr(assert._capt(assert._capt(typeof assert._capt(assert._capt(foo, 'arguments/0/left/argument/object').bar, 'arguments/0/left/argument'), 'arguments/0/left') !== 'undefined', 'arguments/0'), {
    content: 'assert(typeof foo.bar !== \'undefined\')',
    filepath: 'path/to/some_test.js',
    line: 13
}));
assert.strictEqual(assert._expr(assert._capt(typeof foo, 'arguments/0'), {
    content: 'assert.strictEqual(typeof foo, typeof bar)',
    filepath: 'path/to/some_test.js',
    line: 15
}), assert._expr(assert._capt(typeof bar, 'arguments/1'), {
    content: 'assert.strictEqual(typeof foo, typeof bar)',
    filepath: 'path/to/some_test.js',
    line: 15
}));
