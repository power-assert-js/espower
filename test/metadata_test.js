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

describe('simple Identifier: assert(falsy)', () => {
  const input = `
const falsy = false;
assert(falsy);
`;

  const metadataGenerator = [
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

  const metadata = "var _am1=_pwmeta1(0,'assert(falsy)','path/to/some_test.js',3);";
  const recorderLine = "var _ag1=new _ArgumentRecorder1(assert,_am1,0);";
  const assertionLine = "const falsy=false;assert(_ag1._rec(falsy,'arguments/0'));";

  it ('metadata generator function', () => {
    const { lastLine } = transpile(input, { patterns: ['assert(value, [message])'] });
    assert.strictEqual(lastLine.substring(0, metadataGenerator.length), metadataGenerator);
  });

  it('assertion metadata', () => {
    const { lastLine } = transpile(input, { patterns: ['assert(value, [message])'] });
    const startAt = metadataGenerator.length;
    const endAt = startAt + metadata.length;
    assert.strictEqual(lastLine.substring(startAt, endAt), metadata);
  });

  it('ag', () => {
    const { lastLine } = transpile(input, { patterns: ['assert(value, [message])'] });
    const startAt = lastLine.length - (recorderLine.length + assertionLine.length);
    const endAt = lastLine.length - assertionLine.length;
    assert.strictEqual(lastLine.substring(startAt, endAt), recorderLine);
  });

  it('assertion', () => {
    const { lastLine } = transpile(input, { patterns: ['assert(value, [message])'] });
    const startAt = lastLine.length - assertionLine.length;
    const endAt = lastLine.length;
    assert.strictEqual(lastLine.substring(startAt, endAt), assertionLine);
  });

});
