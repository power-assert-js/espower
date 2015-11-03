espower
================================

[![Build Status][travis-image]][travis-url]
[![NPM package][npm-image]][npm-url]
[![Bower package][bower-image]][bower-url]
[![Dependency Status][depstat-image]][depstat-url]
[![Coverage Status][coverage-image]][coverage-url]
[![Code Climate][codeclimate-image]][codeclimate-url]
[![License][license-image]][license-url]
[![Built with Gulp][gulp-image]][gulp-url]


Power Assert feature instrumentor based on the [ECMAScript AST](https://github.com/estree/estree).


DESCRIPTION
---------------------------------------
`espower` is a core module of [power-assert](http://github.com/power-assert-js/power-assert) family. 


`espower` detects and manipulates assertion expression (JavaScript Code) in the form of ECMAScript AST defined in [The ESTree Spec](https://github.com/estree/estree) (formerly known as [Mozilla SpiderMonkey Parser API](https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API)), to instrument power-assert feature into returned new AST object. AST in, AST out. Since 0.11.0, `espower` can transform ES6 AST as well.


Pull-requests, issue reports and patches are always welcomed. See [power-assert](http://github.com/power-assert-js/power-assert) project for more documentation.


CHANGELOG
---------------------------------------
See [CHANGELOG](https://github.com/power-assert-js/espower/blob/master/CHANGELOG.md)


API
---------------------------------------

### var modifiedAst = espower(originalAst, [options])

| return type |
|:------------|
| `object`    |

`espower` function manipulates `originalAst` then returns `modifiedAst` that is also an AST node object defined in [The ESTree Spec](https://github.com/estree/estree).
If `destructive` option is falsy, `originalAst` will be unchanged. If `destructive` option is truthy, `originalAst` will be manipulated directly and returned `modifiedAst` will be the same instance of `originalAst`.

`espower` function throws `EspowerError` when

* `originalAst` is already instrumented
* `originalAst` does not contain location information
* `options` argument is not valid


#### originalAst

| type     | default value |
|:---------|:--------------|
| `object` | N/A           |

`originalAst` should be an AST node object defined in [The ESTree Spec](https://github.com/estree/estree).


#### options

| type     | default value |
|:---------|:--------------|
| `object` | (return value of `espower.defaultOptions()`) |

Configuration options. If not passed, default options will be used.


#### options.destructive

| type      | default value |
|:----------|:--------------|
| `boolean` | `false`       |

Modify `originalAst` destructively or not.

If `false`, espower clones `originalAst` deeply, so `originalAst` will be unchanged. If `true`, `originalAst` will be manipulated directly and returned `modifiedAst` will be the same instance of `originalAst`.


#### options.patterns

| type                | default value       |
|:--------------------|:--------------------|
| `Array` of `string` | objects shown below |

```javascript
[
    'assert(value, [message])',
    'assert.ok(value, [message])',
    'assert.equal(actual, expected, [message])',
    'assert.notEqual(actual, expected, [message])',
    'assert.strictEqual(actual, expected, [message])',
    'assert.notStrictEqual(actual, expected, [message])',
    'assert.deepEqual(actual, expected, [message])',
    'assert.notDeepEqual(actual, expected, [message])',
    'assert.deepStrictEqual(actual, expected, [message])',
    'assert.notDeepStrictEqual(actual, expected, [message])'
]
```

Target patterns for power assert feature instrumentation.

If callee name (for example, `assert.equal`) matches exactly and number of arguments is satisfied, then the assertion will be modified.
Detection is done by [escallmatch](http://github.com/twada/escallmatch). Any arguments enclosed in bracket (for example, `[message]`) means optional parameters. Without bracket means mandatory parameters.


#### (optional) options.path

| type     | default value |
|:---------|:--------------|
| `string` | N/A           |

Filepath of `originalAst`. If passed, espower stores filepath information for reporting. If `options.path` is absolute and it conflicts with `options.sourceRoot` or `sourceRoot` in `options.sourceMap`, then filepath in power-assert output will be fall back on `basename` of `options.path`. This property is optional.


#### (optional) options.sourceRoot

| type     | default value |
|:---------|:--------------|
| `string` | N/A           |

Root filepath for target test files. Only works with `options.path` or `options.sourceMap`. If set, filepath in power-assert output will be relative from `options.sourceRoot`. When both `options.sourceRoot` and sourceMap's sourceRoot are given and both are absolute filepath, `options.sourceRoot` has precedence over sourceMap's sourceRoot. This property is optional.


#### (optional) options.sourceMap

| type                | default value |
|:--------------------|:--------------|
| `object` or `string`| N/A           |

A raw (either as a string which can be JSON.parse'd, or an object) [SourceMap](https://github.com/mozilla/source-map/) associated with `originalAst`. This property is optional. If given, espower uses `options.sourceMap` to adjust information in the power-assert output.


#### (optional) options.visitorKeys

| type     | default value |
|:---------|:--------------|
| `object` | N/A           |

VisitorKeys for AST traversal. See [estraverse.VisitorKeys](https://github.com/estools/estraverse/blob/4.0.0/estraverse.js#L217-L288) and [babel.types.VISITOR_KEYS](https://github.com/babel/babel/blob/v5.1.13/src/babel/types/visitor-keys.json).


### var options = espower.defaultOptions();

Returns default options object for `espower` function. In other words, returns

```javascript
{
    destructive: false,
    patterns: [
        'assert(value, [message])',
        'assert.ok(value, [message])',
        'assert.equal(actual, expected, [message])',
        'assert.notEqual(actual, expected, [message])',
        'assert.strictEqual(actual, expected, [message])',
        'assert.notStrictEqual(actual, expected, [message])',
        'assert.deepEqual(actual, expected, [message])',
        'assert.notDeepEqual(actual, expected, [message])',
        'assert.deepStrictEqual(actual, expected, [message])',
        'assert.notDeepStrictEqual(actual, expected, [message])'
    ]
}
```


EXAMPLE
---------------------------------------

For given test file `example_test.js` below,

```javascript
var assert = require('power-assert');
var truthy = 'true';
var falsy = 'false';
assert(falsy);
assert.equal(truthy, falsy);
```

Apply `espower` then generate modified code to console,

```javascript
var espower = require('espower');
var esprima = require('esprima');
var escodegen = require('escodegen');
var fs = require('fs');
var path = require('path');

var filepath = path.join(__dirname, 'example_test.js');
var jsAst = esprima.parse(fs.readFileSync(filepath), {tolerant: true, loc: true, tokens: true});
var modifiedAst = espower(jsAst, {path: filepath, sourceRoot: __dirname});

console.log(escodegen.generate(modifiedAst));
```

Output:

```javascript
var assert = require('power-assert');
var truthy = 'true';
var falsy = 'false';
assert(assert._expr(assert._capt(falsy, 'arguments/0'), {
    content: 'assert(falsy)',
    filepath: 'example_test.js',
    line: 4
}));
assert.equal(assert._expr(assert._capt(truthy, 'arguments/0'), {
    content: 'assert.equal(truthy, falsy)',
    filepath: 'example_test.js',
    line: 5
}), assert._expr(assert._capt(falsy, 'arguments/1'), {
    content: 'assert.equal(truthy, falsy)',
    filepath: 'example_test.js',
    line: 5
}));
```


INSTALL
---------------------------------------

### via npm

Install

    $ npm install --save-dev espower

#### use espower module on browser

`espower` function is exported

    <script type="text/javascript" src="./path/to/node_modules/espower/build/espower.js"></script>


### via bower

Install

    $ bower install --save-dev espower

Then load (`espower` function is exported)

    <script type="text/javascript" src="./path/to/bower_components/espower/build/espower.js"></script>


AUTHOR
---------------------------------------
* [Takuto Wada](http://github.com/twada)


CONTRIBUTORS
---------------------------------------
* [James Talmage (jamestalmage)](https://github.com/jamestalmage)


LICENSE
---------------------------------------
Licensed under the [MIT](https://github.com/power-assert-js/espower/blob/master/MIT-LICENSE.txt) license.


[npm-url]: https://npmjs.org/package/espower
[npm-image]: https://badge.fury.io/js/espower.svg

[bower-url]: http://badge.fury.io/bo/espower
[bower-image]: https://badge.fury.io/bo/espower.svg

[travis-url]: http://travis-ci.org/power-assert-js/espower
[travis-image]: https://secure.travis-ci.org/power-assert-js/espower.svg?branch=master

[depstat-url]: https://gemnasium.com/power-assert-js/espower
[depstat-image]: https://gemnasium.com/power-assert-js/espower.svg

[license-url]: https://github.com/power-assert-js/espower/blob/master/MIT-LICENSE.txt
[license-image]: http://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat

[codeclimate-url]: https://codeclimate.com/github/power-assert-js/espower
[codeclimate-image]: https://codeclimate.com/github/power-assert-js/espower/badges/gpa.svg

[coverage-url]: https://coveralls.io/r/power-assert-js/espower?branch=master
[coverage-image]: https://coveralls.io/repos/power-assert-js/espower/badge.svg?branch=master

[gulp-url]: http://gulpjs.com/
[gulp-image]: http://img.shields.io/badge/built_with-gulp-brightgreen.svg
