'use strict';
assert(assert._expr(assert._capt(new Date(), 'arguments/0'), {
    content: 'assert(new Date())',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(assert._expr(assert._capt(new (assert._capt(assert._capt(foo, 'arguments/0/callee/object/object').bar, 'arguments/0/callee/object')).Baz(), 'arguments/0'), {
    content: 'assert(new foo.bar.Baz())',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert(assert._expr(assert._capt(!assert._capt(new Array(assert._capt(foo, 'arguments/0/argument/arguments/0'), assert._capt(bar, 'arguments/0/argument/arguments/1'), assert._capt(baz, 'arguments/0/argument/arguments/2')), 'arguments/0/argument'), 'arguments/0'), {
    content: 'assert(!new Array(foo, bar, baz))',
    filepath: 'path/to/some_test.js',
    line: 7
}));
assert.notEqual(assert._expr(assert._capt(new Date(), 'arguments/0'), {
    content: 'assert.notEqual(new Date(), new Date(\'2013-01-12\'))',
    filepath: 'path/to/some_test.js',
    line: 9
}), assert._expr(assert._capt(new Date('2013-01-12'), 'arguments/1'), {
    content: 'assert.notEqual(new Date(), new Date(\'2013-01-12\'))',
    filepath: 'path/to/some_test.js',
    line: 9
}));
