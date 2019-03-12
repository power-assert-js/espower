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
var _am1 = _pwmeta1(0, 'assert(func())', 'path/to/some_test.js', 3);
var _ag1 = new _ArgumentRecorder1(assert, _am1, 0);
var _am2 = _pwmeta1(0, 'assert(obj.age())', 'path/to/some_test.js', 5);
var _ag2 = new _ArgumentRecorder1(assert, _am2, 0);
var _am3 = _pwmeta1(0, 'assert(isFalsy(positiveInt))', 'path/to/some_test.js', 7);
var _ag3 = new _ArgumentRecorder1(assert, _am3, 0);
var _am4 = _pwmeta1(0, 'assert(foo[propName]())', 'path/to/some_test.js', 9);
var _ag4 = new _ArgumentRecorder1(assert, _am4, 0);
var _am5 = _pwmeta1(0, 'assert(foo[hoge[fuga[piyo]]]())', 'path/to/some_test.js', 11);
var _ag5 = new _ArgumentRecorder1(assert, _am5, 0);
var _am6 = _pwmeta1(0, 'assert(sum(one, two, three) === seven)', 'path/to/some_test.js', 13);
var _ag6 = new _ArgumentRecorder1(assert, _am6, 0);
var _am7 = _pwmeta1(0, 'assert(sum(sum(one, two), three) === sum(sum(two, three), seven))', 'path/to/some_test.js', 15);
var _ag7 = new _ArgumentRecorder1(assert, _am7, 0);
var _am8 = _pwmeta1(0, 'assert(math.calc.sum(one, two, three) === seven)', 'path/to/some_test.js', 17);
var _ag8 = new _ArgumentRecorder1(assert, _am8, 0);
var _am9 = _pwmeta1(0, 'assert(three * (seven * ten) === three)', 'path/to/some_test.js', 19);
var _ag9 = new _ArgumentRecorder1(assert, _am9, 0);
var _am10 = _pwmeta1(0, 'assert(!concat(fuga, piyo))', 'path/to/some_test.js', 21);
var _ag10 = new _ArgumentRecorder1(assert, _am10, 0);
var _am11 = _pwmeta1(4, 'assert.strictEqual(three * (seven * ten), math.calc.sum(one, two, three))', 'path/to/some_test.js', 23);
var _ag11 = new _ArgumentRecorder1(assert.strictEqual, _am11, 0);
var _ag12 = new _ArgumentRecorder1(assert.strictEqual, _am11, 1);
assert(_ag1._rec(func(), 'arguments/0'));
assert(_ag2._rec(_ag2._tap(obj, 'arguments/0/callee/object').age(), 'arguments/0'));
assert(_ag3._rec(isFalsy(_ag3._tap(positiveInt, 'arguments/0/arguments/0')), 'arguments/0'));
assert(_ag4._rec(_ag4._tap(foo, 'arguments/0/callee/object')[_ag4._tap(propName, 'arguments/0/callee/property')](), 'arguments/0'));
assert(_ag5._rec(_ag5._tap(foo, 'arguments/0/callee/object')[_ag5._tap(_ag5._tap(hoge, 'arguments/0/callee/property/object')[_ag5._tap(_ag5._tap(fuga, 'arguments/0/callee/property/property/object')[_ag5._tap(piyo, 'arguments/0/callee/property/property/property')], 'arguments/0/callee/property/property')], 'arguments/0/callee/property')](), 'arguments/0'));
assert(_ag6._rec(_ag6._tap(sum(_ag6._tap(one, 'arguments/0/left/arguments/0'), _ag6._tap(two, 'arguments/0/left/arguments/1'), _ag6._tap(three, 'arguments/0/left/arguments/2')), 'arguments/0/left') === _ag6._tap(seven, 'arguments/0/right'), 'arguments/0'));
assert(_ag7._rec(_ag7._tap(sum(_ag7._tap(sum(_ag7._tap(one, 'arguments/0/left/arguments/0/arguments/0'), _ag7._tap(two, 'arguments/0/left/arguments/0/arguments/1')), 'arguments/0/left/arguments/0'), _ag7._tap(three, 'arguments/0/left/arguments/1')), 'arguments/0/left') === _ag7._tap(sum(_ag7._tap(sum(_ag7._tap(two, 'arguments/0/right/arguments/0/arguments/0'), _ag7._tap(three, 'arguments/0/right/arguments/0/arguments/1')), 'arguments/0/right/arguments/0'), _ag7._tap(seven, 'arguments/0/right/arguments/1')), 'arguments/0/right'), 'arguments/0'));
assert(_ag8._rec(_ag8._tap(_ag8._tap(_ag8._tap(math, 'arguments/0/left/callee/object/object').calc, 'arguments/0/left/callee/object').sum(_ag8._tap(one, 'arguments/0/left/arguments/0'), _ag8._tap(two, 'arguments/0/left/arguments/1'), _ag8._tap(three, 'arguments/0/left/arguments/2')), 'arguments/0/left') === _ag8._tap(seven, 'arguments/0/right'), 'arguments/0'));
assert(_ag9._rec(_ag9._tap(_ag9._tap(three, 'arguments/0/left/left') * _ag9._tap(_ag9._tap(seven, 'arguments/0/left/right/left') * _ag9._tap(ten, 'arguments/0/left/right/right'), 'arguments/0/left/right'), 'arguments/0/left') === _ag9._tap(three, 'arguments/0/right'), 'arguments/0'));
assert(_ag10._rec(!_ag10._tap(concat(_ag10._tap(fuga, 'arguments/0/argument/arguments/0'), _ag10._tap(piyo, 'arguments/0/argument/arguments/1')), 'arguments/0/argument'), 'arguments/0'));
assert.strictEqual(_ag11._rec(_ag11._tap(three, 'arguments/0/left') * _ag11._tap(_ag11._tap(seven, 'arguments/0/right/left') * _ag11._tap(ten, 'arguments/0/right/right'), 'arguments/0/right'), 'arguments/0'), _ag12._rec(_ag12._tap(_ag12._tap(math, 'arguments/1/callee/object/object').calc, 'arguments/1/callee/object').sum(_ag12._tap(one, 'arguments/1/arguments/0'), _ag12._tap(two, 'arguments/1/arguments/1'), _ag12._tap(three, 'arguments/1/arguments/2')), 'arguments/1'));
