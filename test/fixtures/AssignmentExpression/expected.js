'use strict';
assert(assert._expr(assert._capt(counter += 1, 'arguments/0'), {
    content: 'assert(counter += 1)',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(assert._expr(assert._capt(dog.age += 1, 'arguments/0'), {
    content: 'assert(dog.age += 1)',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert(assert._expr(assert._capt(dog.age += 1, 'arguments/0'), {
    content: 'assert(dog.age += 1)',
    filepath: 'path/to/some_test.js',
    line: 7
}));
assert.strictEqual(assert._expr(assert._capt(dog.age += 1, 'arguments/0'), {
    content: 'assert.strictEqual(dog.age += 1, three)',
    filepath: 'path/to/some_test.js',
    line: 9
}), assert._expr(assert._capt(three, 'arguments/1'), {
    content: 'assert.strictEqual(dog.age += 1, three)',
    filepath: 'path/to/some_test.js',
    line: 9
}));
assert(assert._expr(assert._capt([x] = assert._capt([3], 'arguments/0/right'), 'arguments/0'), {
    content: 'assert([x] = [3])',
    filepath: 'path/to/some_test.js',
    line: 11
}));
assert(assert._expr(assert._capt([x] = assert._capt([assert._capt(foo, 'arguments/0/right/elements/0')], 'arguments/0/right'), 'arguments/0'), {
    content: 'assert([x] = [foo])',
    filepath: 'path/to/some_test.js',
    line: 13
}));
