const assert = require('assert');
const acorn = require('acorn');
require('acorn-es7-plugin')(acorn);
const escodegen = require('escodegen');
const espower = require('..');

const transpile = ({input, espowerOptions = {}, parserOptions = {}}) => {
  const options = Object.assign({ecmaVersion: 2018, locations: true, ranges: true, plugins: {asyncawait: true}}, parserOptions);
  const ast = acorn.parse(input, options);
  const espoweredAST = espower(ast, Object.assign({ path: 'path/to/some_test.js', parse: acorn.parse }, espowerOptions));
  const result = escodegen.generate(espoweredAST, {format: {compact: true}});
  const lines = result.split('\n');
  const lastLine = lines[lines.length - 1];
  return {
    result,
    lastLine
  };
};

const testGeneratedCode = ({suite, input, prelude = [], postlude = [], espowerOptions = {}, parserOptions = {}}) => {
  describe(suite, () => {
    const lastLine = transpile({input, espowerOptions, parserOptions}).lastLine;
    prelude.reduce((startAt, fragment, idx) => {
      const endAt = startAt + fragment.length;
      it (`prelude${idx} ${fragment}`, () => {
        assert.strictEqual(lastLine.substring(startAt, endAt), fragment);
      });
      return endAt;
    }, 0);
    postlude.reduceRight((endAt, fragment, idx) => {
      const startAt = endAt - fragment.length;
      it (`postlude${idx} ${fragment}`, () => {
        assert.strictEqual(lastLine.substring(startAt, endAt), fragment);
      });
      return startAt;
    }, lastLine.length);
  });
};

module.exports = {
  transpile,
  testGeneratedCode
};
