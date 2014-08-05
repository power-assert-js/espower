espower
================================

[![Build Status](https://travis-ci.org/twada/espower.svg?branch=master)](https://travis-ci.org/twada/espower)
[![NPM version](https://badge.fury.io/js/espower.svg)](http://badge.fury.io/js/espower)
[![Dependency Status](https://gemnasium.com/twada/espower.svg)](https://gemnasium.com/twada/espower)
[![Coverage Status](https://coveralls.io/repos/twada/espower/badge.png?branch=master)](https://coveralls.io/r/twada/espower?branch=master)
[![License](http://img.shields.io/badge/license-MIT-brightgreen.svg)](https://github.com/twada/espower/blob/master/MIT-LICENSE.txt)
[![Built with Gulp](http://img.shields.io/badge/built_with-gulp-brightgreen.svg)](http://gulpjs.com/)


Power Assert feature instrumentor based on the Mozilla JavaScript AST.


DESCRIPTION
---------------------------------------
`espower` is a core module of [power-assert](http://github.com/twada/power-assert) family.


`espower` manipulates assertion expression (JavaScript Code) represented as [Mozilla JavaScript AST](https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API), to instrument power-assert feature into the code.


Please note that `espower` is a beta version product. Pull-requests, issue reports and patches are always welcomed. See [power-assert](http://github.com/twada/power-assert) project for more documentation.


API
---------------------------------------

### var modifiedAst = espower(originalAst, options)

Instruments power assert feature into originalAst. [Mozilla JavaScript AST](https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API) in, Mozilla JavaScript AST out.


#### options.destructive

Type: `boolean`
Default value: `false`

Modify `originalAst` destructively or not. If `false`, espower clones `originalAst` deeply, so `originalAst` will be unchanged.


#### options.patterns

Type: `Array`
Default value: 

```javascript
[
    'assert(value, [message])',
    'assert.ok(value, [message])',
    'assert.equal(actual, expected, [message])',
    'assert.notEqual(actual, expected, [message])',
    'assert.strictEqual(actual, expected, [message])',
    'assert.notStrictEqual(actual, expected, [message])',
    'assert.deepEqual(actual, expected, [message])',
    'assert.notDeepEqual(actual, expected, [message])'
]
```

Target patterns for power assert feature instrumentation. If callee name (for example, `assert.equal`) matches exactly and number of arguments is satisfied, then the assertion will be modified. Detection is done by [escallmatch](http://github.com/twada/escallmatch). Any arguments enclosed in bracket (for example, `[message]`) means optional parameters. Without bracket means mandatory parameters.



INSTALL
---------------------------------------

### via npm

Install

    $ npm install --save espower


### via bower

Install

    $ bower install --save espower

Then load (`espower` function is exported)

    <script type="text/javascript" src="./path/to/bower_components/espower/build/espower.js"></script>


AUTHOR
---------------------------------------
* [Takuto Wada](http://github.com/twada)


LICENSE
---------------------------------------
Licensed under the [MIT](https://github.com/twada/espower/blob/master/MIT-LICENSE.txt) license.
