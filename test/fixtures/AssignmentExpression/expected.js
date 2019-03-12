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
var _AssertionMessage1 = function () {
    const _s = '\n\n      ';
    class AssertionMessage {
        constructor(am, matchIndex, msgOrRec) {
            this._am = am;
            this._idx = matchIndex;
            this._msgOrRec = msgOrRec;
        }
        metadata() {
            return this._am;
        }
        matchIndex() {
            return this._idx;
        }
        val() {
            if (this._msgOrRec && typeof this._msgOrRec.val === 'function') {
                return this._msgOrRec.val();
            } else {
                return this._msgOrRec;
            }
        }
        eject() {
            if (this._msgOrRec && typeof this._msgOrRec.eject === 'function') {
                return this._msgOrRec.eject();
            } else {
                return {
                    value: this.val(),
                    logs: []
                };
            }
        }
        toString() {
            let msg = typeof this._msgOrRec === 'string' ? this._msgOrRec : '';
            msg += `${ _s }# ${ this._am.filepath }:${ this._am.line }`;
            msg += `${ _s }${ this._am.content }`;
            msg += `${ _s }[WARNING] power-assert is not configured. see: https://github.com/power-assert-js/power-assert`;
            msg += `\n`;
            return msg;
        }
    }
    return AssertionMessage;
}();
var _am1 = _pwmeta1(0, 'assert(counter += 1)', 'path/to/some_test.js', 3);
var _ag1 = new _ArgumentRecorder1(assert, _am1, 0);
var _am2 = _pwmeta1(0, 'assert(dog.age += 1)', 'path/to/some_test.js', 5);
var _ag2 = new _ArgumentRecorder1(assert, _am2, 0);
var _am3 = _pwmeta1(0, 'assert(dog.age += 1)', 'path/to/some_test.js', 7);
var _ag3 = new _ArgumentRecorder1(assert, _am3, 0);
var _am4 = _pwmeta1(4, 'assert.strictEqual(dog.age += 1, three)', 'path/to/some_test.js', 9);
var _ag4 = new _ArgumentRecorder1(assert.strictEqual, _am4, 0);
var _ag5 = new _ArgumentRecorder1(assert.strictEqual, _am4, 1);
var _am5 = _pwmeta1(0, 'assert([x] = [3])', 'path/to/some_test.js', 12);
var _ag6 = new _ArgumentRecorder1(assert, _am5, 0);
var _am6 = _pwmeta1(0, 'assert([x] = [foo])', 'path/to/some_test.js', 14);
var _ag7 = new _ArgumentRecorder1(assert, _am6, 0);
assert(_ag1._rec(counter += 1, 'arguments/0'));
assert(_ag2._rec(dog.age += 1, 'arguments/0'));
assert(_ag3._rec(dog.age += 1, 'arguments/0'));
assert.strictEqual(_ag4._rec(dog.age += 1, 'arguments/0'), _ag5._rec(three, 'arguments/1'));
assert(_ag6._rec([x] = _ag6._tap([3], 'arguments/0/right'), 'arguments/0'));
assert(_ag7._rec([x] = _ag7._tap([_ag7._tap(foo, 'arguments/0/right/elements/0')], 'arguments/0/right'), 'arguments/0'));
