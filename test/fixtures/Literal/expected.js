'use strict';
var _pwmeta1 = (ptnidx, content, filepath, line, extra) => {
    const version = 2, patterns = [
            {
                pattern: 'assert(value, [message])',
                args: [
                    {
                        index: 0,
                        name: 'value',
                        kind: 'mandatory'
                    },
                    {
                        index: 1,
                        name: 'message',
                        kind: 'optional',
                        message: true
                    }
                ]
            },
            {
                pattern: 'assert.ok(value, [message])',
                args: [
                    {
                        index: 0,
                        name: 'value',
                        kind: 'mandatory'
                    },
                    {
                        index: 1,
                        name: 'message',
                        kind: 'optional',
                        message: true
                    }
                ]
            },
            {
                pattern: 'assert.equal(actual, expected, [message])',
                args: [
                    {
                        index: 0,
                        name: 'actual',
                        kind: 'mandatory'
                    },
                    {
                        index: 1,
                        name: 'expected',
                        kind: 'mandatory'
                    },
                    {
                        index: 2,
                        name: 'message',
                        kind: 'optional',
                        message: true
                    }
                ]
            },
            {
                pattern: 'assert.notEqual(actual, expected, [message])',
                args: [
                    {
                        index: 0,
                        name: 'actual',
                        kind: 'mandatory'
                    },
                    {
                        index: 1,
                        name: 'expected',
                        kind: 'mandatory'
                    },
                    {
                        index: 2,
                        name: 'message',
                        kind: 'optional',
                        message: true
                    }
                ]
            },
            {
                pattern: 'assert.strictEqual(actual, expected, [message])',
                args: [
                    {
                        index: 0,
                        name: 'actual',
                        kind: 'mandatory'
                    },
                    {
                        index: 1,
                        name: 'expected',
                        kind: 'mandatory'
                    },
                    {
                        index: 2,
                        name: 'message',
                        kind: 'optional',
                        message: true
                    }
                ]
            },
            {
                pattern: 'assert.notStrictEqual(actual, expected, [message])',
                args: [
                    {
                        index: 0,
                        name: 'actual',
                        kind: 'mandatory'
                    },
                    {
                        index: 1,
                        name: 'expected',
                        kind: 'mandatory'
                    },
                    {
                        index: 2,
                        name: 'message',
                        kind: 'optional',
                        message: true
                    }
                ]
            },
            {
                pattern: 'assert.deepEqual(actual, expected, [message])',
                args: [
                    {
                        index: 0,
                        name: 'actual',
                        kind: 'mandatory'
                    },
                    {
                        index: 1,
                        name: 'expected',
                        kind: 'mandatory'
                    },
                    {
                        index: 2,
                        name: 'message',
                        kind: 'optional',
                        message: true
                    }
                ]
            },
            {
                pattern: 'assert.notDeepEqual(actual, expected, [message])',
                args: [
                    {
                        index: 0,
                        name: 'actual',
                        kind: 'mandatory'
                    },
                    {
                        index: 1,
                        name: 'expected',
                        kind: 'mandatory'
                    },
                    {
                        index: 2,
                        name: 'message',
                        kind: 'optional',
                        message: true
                    }
                ]
            },
            {
                pattern: 'assert.deepStrictEqual(actual, expected, [message])',
                args: [
                    {
                        index: 0,
                        name: 'actual',
                        kind: 'mandatory'
                    },
                    {
                        index: 1,
                        name: 'expected',
                        kind: 'mandatory'
                    },
                    {
                        index: 2,
                        name: 'message',
                        kind: 'optional',
                        message: true
                    }
                ]
            },
            {
                pattern: 'assert.notDeepStrictEqual(actual, expected, [message])',
                args: [
                    {
                        index: 0,
                        name: 'actual',
                        kind: 'mandatory'
                    },
                    {
                        index: 1,
                        name: 'expected',
                        kind: 'mandatory'
                    },
                    {
                        index: 2,
                        name: 'message',
                        kind: 'optional',
                        message: true
                    }
                ]
            }
        ];
    return Object.assign({
        version,
        content,
        filepath,
        line
    }, extra, patterns[ptnidx]);
};
var _am1 = _pwmeta1(0, 'assert(false)', 'path/to/some_test.js', 3);
var _am2 = _pwmeta1(0, 'assert(0)', 'path/to/some_test.js', 5);
var _am3 = _pwmeta1(2, 'assert.equal(1, 0)', 'path/to/some_test.js', 7);
var _am4 = _pwmeta1(0, 'assert(false, \'message\')', 'path/to/some_test.js', 9);
var _am5 = _pwmeta1(0, 'assert(false, messageStr)', 'path/to/some_test.js', 11);
var _am6 = _pwmeta1(2, 'assert.equal(foo, \'bar\', \'msg\')', 'path/to/some_test.js', 13);
var _ArgumentRecorder1 = function () {
    const isPromiseLike = o => o !== null && typeof o === 'object' && typeof o.then === 'function' && typeof o.catch === 'function';
    const mark = (_this, s) => {
        return function () {
            const args = Array.from(arguments);
            _this.status = s;
            _this.value = args.length === 1 ? args[0] : args;
        };
    };
    class $Promise$ {
        constructor(prms) {
            this.status = 'pending';
            prms.then(mark(this, 'resolved'), mark(this, 'rejected'));
        }
    }
    const wrap = v => isPromiseLike(v) ? new $Promise$(v) : v;
    class ArgumentRecorder {
        constructor(callee, am, matchIndex) {
            this._callee = callee;
            this._am = am;
            this._logs = [];
            this._recorded = null;
            this._val = null;
            this._idx = matchIndex;
            const argconf = am.args[matchIndex];
            this._isBlock = !!argconf.block;
        }
        metadata() {
            return this._am;
        }
        matchIndex() {
            return this._idx;
        }
        val() {
            return this._val;
        }
        _tap(value, espath) {
            this._logs.push({
                value: wrap(value),
                espath
            });
            return value;
        }
        _rec(value, espath) {
            const empowered = this._callee && this._callee._empowered;
            try {
                if (!empowered)
                    return value;
                const log = {
                    value: wrap(value),
                    espath
                };
                this._logs.push(log);
                if (this._isBlock && empowered && typeof value === 'function') {
                    value = new Proxy(value, {
                        apply(target, thisArg, args) {
                            try {
                                const ret = target.apply(thisArg, args);
                                log.value = wrap(ret);
                                return ret;
                            } catch (e) {
                                log.value = e;
                                throw e;
                            }
                        }
                    });
                }
                this._recorded = {
                    value,
                    logs: [].concat(this._logs)
                };
                return this;
            } finally {
                this._val = value;
                this._logs = [];
            }
        }
        eject() {
            const ret = this._recorded;
            this._recorded = null;
            this._val = null;
            return ret;
        }
    }
    return ArgumentRecorder;
}();
var _ag1 = new _ArgumentRecorder1(assert.equal, _am6, 2);
var _am7 = _pwmeta1(0, 'assert(/^not/.exec(str))', 'path/to/some_test.js', 16);
var _ag2 = new _ArgumentRecorder1(assert, _am7, 0);
var _am8 = _pwmeta1(0, 'assert(fuga !== \'ふが\')', 'path/to/some_test.js', 19);
var _ag3 = new _ArgumentRecorder1(assert, _am8, 0);
var _am9 = _pwmeta1(0, 'assert(\'ほげ\' !== \'ふが\')', 'path/to/some_test.js', 20);
var _ag4 = new _ArgumentRecorder1(assert, _am9, 0);
var _am10 = _pwmeta1(0, 'assert(0b111110111)', 'path/to/some_test.js', 23);
var _am11 = _pwmeta1(0, 'assert(0o767)', 'path/to/some_test.js', 26);
assert(false);
assert(0);
assert.equal(1, 0);
assert(false, 'message');
assert(false, messageStr);
assert.equal(_ag1._rec(foo, 'arguments/0'), 'bar', 'msg');
assert(_ag2._rec(/^not/.exec(_ag2._tap(str, 'arguments/0/arguments/0')), 'arguments/0'));
assert(_ag3._rec(_ag3._tap(fuga, 'arguments/0/left') !== 'ふが', 'arguments/0'));
assert(_ag4._rec('ほげ' !== 'ふが', 'arguments/0'));
assert(503);
assert(503);
