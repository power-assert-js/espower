'use strict';
assert(assert._expr(assert._capt((2, 1, 0), 'arguments/0'), {
    content: 'assert((2, 1, 0))',
    filepath: 'path/to/some_test.js',
    line: 3
}));
assert(assert._expr(assert._capt(assert._capt((assert._capt(foo, 'arguments/0/left/expressions/0'), assert._capt(bar, 'arguments/0/left/expressions/1')), 'arguments/0/left') === assert._capt(baz, 'arguments/0/right'), 'arguments/0'), {
    content: 'assert((foo, bar) === baz)',
    filepath: 'path/to/some_test.js',
    line: 5
}));
assert(assert._expr(assert._capt(toto(assert._capt((assert._capt(tata, 'arguments/0/arguments/0/expressions/0'), assert._capt(titi, 'arguments/0/arguments/0/expressions/1')), 'arguments/0/arguments/0')), 'arguments/0'), {
    content: 'assert(toto((tata, titi)))',
    filepath: 'path/to/some_test.js',
    line: 7
}));
assert(assert._expr(assert._capt((assert._capt(foo, 'arguments/0/expressions/0'), assert._capt((assert._capt(bar, 'arguments/0/expressions/1/expressions/0'), assert._capt(baz, 'arguments/0/expressions/1/expressions/1')), 'arguments/0/expressions/1')), 'arguments/0'), {
    content: 'assert((foo, (bar, baz)))',
    filepath: 'path/to/some_test.js',
    line: 9
}));
assert(assert._expr(assert._capt((assert._capt((assert._capt((assert._capt((assert._capt((assert._capt(foo, 'arguments/0/expressions/0/expressions/0/expressions/0/expressions/0/expressions/0'), assert._capt(bar, 'arguments/0/expressions/0/expressions/0/expressions/0/expressions/0/expressions/1')), 'arguments/0/expressions/0/expressions/0/expressions/0/expressions/0'), assert._capt(baz, 'arguments/0/expressions/0/expressions/0/expressions/0/expressions/1')), 'arguments/0/expressions/0/expressions/0/expressions/0'), assert._capt(toto, 'arguments/0/expressions/0/expressions/0/expressions/1')), 'arguments/0/expressions/0/expressions/0'), assert._capt(tata, 'arguments/0/expressions/0/expressions/1')), 'arguments/0/expressions/0'), assert._capt(titi, 'arguments/0/expressions/1')), 'arguments/0'), {
    content: 'assert((((((foo, bar), baz), toto), tata), titi))',
    filepath: 'path/to/some_test.js',
    line: 11
}));
