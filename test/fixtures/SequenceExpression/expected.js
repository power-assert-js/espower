'use strict';
assert((2, 1, 0));
assert(assert._expr(assert._capt((assert._capt(foo, 'arguments/0/left/expressions/0'), assert._capt(bar, 'arguments/0/left/expressions/1')) === assert._capt(baz, 'arguments/0/right'), 'arguments/0'), {
    content: 'assert((foo, bar) === baz)',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert(assert._expr(assert._capt(toto((assert._capt(tata, 'arguments/0/arguments/0/expressions/0'), assert._capt(titi, 'arguments/0/arguments/0/expressions/1'))), 'arguments/0'), {
    content: 'assert(toto((tata, titi)))',
    filepath: 'path/to/some_test.js',
    line: 7
}));
assert(assert._expr((assert._capt(foo, 'arguments/0/expressions/0'), (assert._capt(bar, 'arguments/0/expressions/1/expressions/0'), assert._capt(baz, 'arguments/0/expressions/1/expressions/1'))), {
    content: 'assert((foo, (bar, baz)))',
    filepath: 'path/to/some_test.js',
    line: 9
}));
assert(assert._expr((((((assert._capt(foo, 'arguments/0/expressions/0/expressions/0/expressions/0/expressions/0/expressions/0'), assert._capt(bar, 'arguments/0/expressions/0/expressions/0/expressions/0/expressions/0/expressions/1')), assert._capt(baz, 'arguments/0/expressions/0/expressions/0/expressions/0/expressions/1')), assert._capt(toto, 'arguments/0/expressions/0/expressions/0/expressions/1')), assert._capt(tata, 'arguments/0/expressions/0/expressions/1')), assert._capt(titi, 'arguments/0/expressions/1')), {
    content: 'assert((((((foo, bar), baz), toto), tata), titi))',
    filepath: 'path/to/some_test.js',
    line: 11
}));
assert(assert._expr((assert._capt(y = assert._capt(x, 'arguments/0/expressions/0/right'), 'arguments/0/expressions/0'), assert._capt(z, 'arguments/0/expressions/1')), {
    content: 'assert((y = x, z))',
    filepath: 'path/to/some_test.js',
    line: 13
}));
