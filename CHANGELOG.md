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
