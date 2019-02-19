const assert = require('assert');
const acorn = require('acorn');
require('acorn-es7-plugin')(acorn);
const escodegen = require('escodegen');
const espower = require('..');
const transpile = (code, extraOptions) => {
  const options = {ecmaVersion: 2018, locations: true, ranges: true, plugins: {asyncawait: true}};
  const ast = acorn.parse(code, options);
  const espoweredAST = espower(ast, Object.assign({ path: 'path/to/some_test.js', parse: acorn.parse }, extraOptions));
  const result = escodegen.generate(espoweredAST, {format: {compact: true}});
  const lines = result.split('\n');
  const lastLine = lines[lines.length - 1];
  return {
    result,
    lastLine
  };
};

describe.only('simple Identifier: assert(falsy)', () => {
  const input = `
const falsy = false;
assert(falsy);
`;
  it ('metadata functoin', () => {
    const { lastLine } = transpile(input, { patterns: ['assert(value, [message])'] });
    const expected = [
      "var _pwmeta1=(ptnidx,content,filepath,line,extra)=>{",
      "const version=2,patterns=[",
      "{",
      "pattern:'assert(value, [message])',",
      "args:[",
      "{index:0,name:'value',kind:'mandatory'},",
      "{index:1,name:'message',kind:'optional',message:true}",
      "]",
      "}",
      "];",
      "return Object.assign({version,content,filepath,line},extra,patterns[ptnidx]);",
      "};"
    ].join('');
    assert.strictEqual(lastLine.substring(0, expected.length), expected);
  });
});
