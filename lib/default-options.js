'use strict';

const defaultOptions = () => {
  return {
    ecmaVersion: 2018,
    sourceType: 'module',
    patterns: [
      'assert(value, [message])',
      'assert.ok(value, [message])',
      'assert.equal(actual, expected, [message])',
      'assert.notEqual(actual, expected, [message])',
      'assert.strictEqual(actual, expected, [message])',
      'assert.notStrictEqual(actual, expected, [message])',
      {
        pattern: 'assert.deepEqual(actual, expected, [message])',
        params: [
          { name: 'actual', options: { maxDepth: 2 } },
          { name: 'expected', options: { maxDepth: 2 } },
          { name: 'message', message: true }
        ]
      },
      {
        pattern: 'assert.notDeepEqual(actual, expected, [message])',
        params: [
          { name: 'actual', options: { maxDepth: 2 } },
          { name: 'expected', options: { maxDepth: 2 } },
          { name: 'message', message: true }
        ]
      },
      {
        pattern: 'assert.deepStrictEqual(actual, expected, [message])',
        params: [
          { name: 'actual', options: { maxDepth: 2 } },
          { name: 'expected', options: { maxDepth: 2 } },
          { name: 'message', message: true }
        ]
      },
      {
        pattern: 'assert.notDeepStrictEqual(actual, expected, [message])',
        params: [
          { name: 'actual', options: { maxDepth: 2 } },
          { name: 'expected', options: { maxDepth: 2 } },
          { name: 'message', message: true }
        ]
      },
      {
        pattern: 'assert.throws(fn, [error], [message])',
        params: [
          { name: 'fn', block: true },
          { name: 'error', block: true },
          { name: 'message', message: true }
        ]
      },
      {
        pattern: 'assert.doesNotThrow(fn, [error], [message])',
        params: [
          { name: 'fn', block: true },
          { name: 'error', block: true },
          { name: 'message', message: true }
        ]
      },
      {
        pattern: 'assert.rejects(asyncFn, [error], [message])',
        params: [
          { name: 'asyncFn', block: true },
          { name: 'error', block: true },
          { name: 'message', message: true }
        ]
      },
      {
        pattern: 'assert.doesNotReject(asyncFn, [error], [message])',
        params: [
          { name: 'asyncFn', block: true },
          { name: 'error', block: true },
          { name: 'message', message: true }
        ]
      }
    ]
  };
};

module.exports = defaultOptions;
