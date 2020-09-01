'use strict';
var _pwptn1 = JSON.parse('[{"pattern":"assert(value, [message])","params":[{"index":0,"name":"value","kind":"mandatory"},{"index":1,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.ok(value, [message])","params":[{"index":0,"name":"value","kind":"mandatory"},{"index":1,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.equal(actual, expected, [message])","params":[{"index":0,"name":"actual","kind":"mandatory"},{"index":1,"name":"expected","kind":"mandatory"},{"index":2,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.notEqual(actual, expected, [message])","params":[{"index":0,"name":"actual","kind":"mandatory"},{"index":1,"name":"expected","kind":"mandatory"},{"index":2,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.strictEqual(actual, expected, [message])","params":[{"index":0,"name":"actual","kind":"mandatory"},{"index":1,"name":"expected","kind":"mandatory"},{"index":2,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.notStrictEqual(actual, expected, [message])","params":[{"index":0,"name":"actual","kind":"mandatory"},{"index":1,"name":"expected","kind":"mandatory"},{"index":2,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.deepEqual(actual, expected, [message])","params":[{"index":0,"name":"actual","kind":"mandatory","options":{"maxDepth":2}},{"index":1,"name":"expected","kind":"mandatory","options":{"maxDepth":2}},{"index":2,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.notDeepEqual(actual, expected, [message])","params":[{"index":0,"name":"actual","kind":"mandatory","options":{"maxDepth":2}},{"index":1,"name":"expected","kind":"mandatory","options":{"maxDepth":2}},{"index":2,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.deepStrictEqual(actual, expected, [message])","params":[{"index":0,"name":"actual","kind":"mandatory","options":{"maxDepth":2}},{"index":1,"name":"expected","kind":"mandatory","options":{"maxDepth":2}},{"index":2,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.notDeepStrictEqual(actual, expected, [message])","params":[{"index":0,"name":"actual","kind":"mandatory","options":{"maxDepth":2}},{"index":1,"name":"expected","kind":"mandatory","options":{"maxDepth":2}},{"index":2,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.throws(fn, [error], [message])","params":[{"index":0,"name":"fn","kind":"mandatory","block":true},{"index":1,"name":"error","kind":"optional","block":true},{"index":2,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.doesNotThrow(fn, [error], [message])","params":[{"index":0,"name":"fn","kind":"mandatory","block":true},{"index":1,"name":"error","kind":"optional","block":true},{"index":2,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.rejects(asyncFn, [error], [message])","params":[{"index":0,"name":"asyncFn","kind":"mandatory","block":true},{"index":1,"name":"error","kind":"optional","block":true},{"index":2,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.doesNotReject(asyncFn, [error], [message])","params":[{"index":0,"name":"asyncFn","kind":"mandatory","block":true},{"index":1,"name":"error","kind":"optional","block":true},{"index":2,"name":"message","kind":"optional","message":true}]}]');
var _pwmeta1 = (ptnidx, content, filepath, line, extra) => {
    return Object.assign({
        transpiler: 'espower',
        version: '3.0.0-beta.1-pre',
        content,
        filepath,
        line
    }, extra, _pwptn1[ptnidx]);
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
            const conf = am.params[matchIndex];
            this._isBlock = !!conf.block;
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
                if (!espath)
                    return this;
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
                return this;
            } finally {
                if (empowered) {
                    this._recorded = {
                        value,
                        logs: [].concat(this._logs)
                    };
                }
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
            msg += '\n';
            return msg;
        }
    }
    return AssertionMessage;
}();
var _am1 = _pwmeta1(0, 'assert(foo ? bar : baz)', 'path/to/some_test.js', 3);
var _ag1 = new _ArgumentRecorder1(assert, _am1, 0);
var _am2 = _pwmeta1(0, 'assert(falsy ? truthy : truthy ? anotherFalsy : truthy)', 'path/to/some_test.js', 5);
var _ag2 = new _ArgumentRecorder1(assert, _am2, 0);
var _am3 = _pwmeta1(0, 'assert(foo() ? bar.baz : typeof goo)', 'path/to/some_test.js', 7);
var _ag3 = new _ArgumentRecorder1(assert, _am3, 0);
var _am4 = _pwmeta1(2, 'assert.equal(foo ? bar : baz, falsy ? truthy : truthy ? anotherFalsy : truthy)', 'path/to/some_test.js', 9);
var _ag4 = new _ArgumentRecorder1(assert.equal, _am4, 0);
var _ag5 = new _ArgumentRecorder1(assert.equal, _am4, 1);
assert(_ag1._rec(_ag1._tap(foo, 'arguments/0/test') ? _ag1._tap(bar, 'arguments/0/consequent') : _ag1._tap(baz, 'arguments/0/alternate')), new _AssertionMessage1(_am1, -1));
assert(_ag2._rec(_ag2._tap(falsy, 'arguments/0/test') ? _ag2._tap(truthy, 'arguments/0/consequent') : _ag2._tap(truthy, 'arguments/0/alternate/test') ? _ag2._tap(anotherFalsy, 'arguments/0/alternate/consequent') : _ag2._tap(truthy, 'arguments/0/alternate/alternate')), new _AssertionMessage1(_am2, -1));
assert(_ag3._rec(_ag3._tap(foo(), 'arguments/0/test') ? _ag3._tap(_ag3._tap(bar, 'arguments/0/consequent/object').baz, 'arguments/0/consequent') : _ag3._tap(typeof goo, 'arguments/0/alternate')), new _AssertionMessage1(_am3, -1));
assert.equal(_ag4._rec(_ag4._tap(foo, 'arguments/0/test') ? _ag4._tap(bar, 'arguments/0/consequent') : _ag4._tap(baz, 'arguments/0/alternate')), _ag5._rec(_ag5._tap(falsy, 'arguments/1/test') ? _ag5._tap(truthy, 'arguments/1/consequent') : _ag5._tap(truthy, 'arguments/1/alternate/test') ? _ag5._tap(anotherFalsy, 'arguments/1/alternate/consequent') : _ag5._tap(truthy, 'arguments/1/alternate/alternate')), new _AssertionMessage1(_am4, -1));
