'use strict';
function* gen(a) {
    assert(assert._expr(assert._capt(assert._capt(yield a, 'arguments/0/left') === 3, 'arguments/0'), {
        content: 'assert((yield a) === 3)',
        filepath: 'path/to/some_test.js',
        generator: true,
        line: 4
    }));
}
