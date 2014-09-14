### 0.9.1 (2014-09-15)


#### Bug Fixes

* **espower:** decide to be skipped first, then enter node ([9d0a778a](https://github.com/twada/espower/commit/9d0a778a1ae97bb5c522cbfc7b1b65250118f2ea))


## 0.9.0 (2014-08-21)


#### Features

* **espower:**
  * adjust filepath in power-assert output if sourceMap option is given ([f919d59d](https://github.com/twada/espower/commit/f919d59d6eea764881e0266f562724b7142f7695))
  * adjust line number in power-assert output if sourceMap option is given ([8c035d89](https://github.com/twada/espower/commit/8c035d89ae88c8554cb8ca0b6bd0f7d6fe2008b0))


## 0.8.0 (2014-08-12)


#### Features


* **espower:**
  * [built and modularized by browserify](https://github.com/twada/espower/pull/9)
  * [use escallmatch module to describe instrumentation target patterns](https://github.com/twada/espower/pull/10)
  * support chained callee like `browser.assert.element(selector)` ([ea0a3ce9](https://github.com/twada/espower/commit/ea0a3ce96f56034ab6735365184e1e397f6561c0))


#### Breaking Changes

  * option `powerAssertVariableName` is now deprecated and ignored. Please use `patterns` option instead ([2f023f91](https://github.com/twada/espower/commit/2f023f91f3bbe8c6d9038e7237541112f2eaf143))
  * option `targetMethods` is now deprecated and ignored. Please use `patterns` option instead ([e75e5d35](https://github.com/twada/espower/commit/e75e5d35c33a7c128f14db224c5387520665b55e))

If you already customize instrumentation pattern using `powerAssertVariableName` and `targetMethods`, you need to migarte. To migrate, change your code from the following:

```javascript
var options = {
    powerAssertVariableName: 'yourAssert',
    targetMethods: {
        oneArg: [
            'okay'
        ],
        twoArgs: [
            'equal',
            'customEqual'
        ]
    }
};
var modifiedAst = espower(jsAst, options);
```

To:

```javascript
var options = {
    patterns: [
        'yourAssert(value, [message])',
        'yourAssert.okay(value, [message])',
        'yourAssert.equal(actual, expected, [message])',
        'yourAssert.customEqual(actual, expected, [message])'
    ]
};
var modifiedAst = espower(jsAst, options);
```
