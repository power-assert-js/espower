'use strict';

var PowerAssertRecorder = require('../power-assert-recorder');
var assert = require('assert');

describe('power-assert-recorder', function () {
    var foo = 'FOO';

    it('_capt', function () {
        var _rec = new PowerAssertRecorder();
        var identVal = _rec._capt(foo, 'arguments/0');
        assert.equal(identVal, 'FOO');
    });

    it('_expr', function () {
        var _rec = new PowerAssertRecorder();
        var capturedExpr = _rec._expr(_rec._capt(foo, 'arguments/0'), {
            content: 'assert(foo)',
            filepath: 'path/to/some_test.js',
            line: 1
        });
        assert.deepEqual(capturedExpr, {
            powerAssertContext: {
                events: [
                    {
                        espath: "arguments/0",
                        value: "FOO"
                    }
                ],
                value: "FOO"
            },
            source: {
                content: "assert(foo)",
                filepath: "path/to/some_test.js",
                line: 1
            }
        });
    });
});
