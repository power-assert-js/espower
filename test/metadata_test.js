const { testGeneratedCode } = require('./helper');
const pkg = require('../package.json');

describe('metadata generator function', () => {
  testGeneratedCode({
    suite: 'default case',
    input: 'assert(falsy);',
    espowerOptions: {
      patterns: ['assert(value, [message])']
    },
    prelude: [
      `var _pwptn1=JSON.parse('[{"pattern":"assert(value, [message])","params":[{"index":0,"name":"value","kind":"mandatory"},{"index":1,"name":"message","kind":"optional","message":true}]}]');`,
      `var _pwmeta1=(ptnidx,content,filepath,line,extra)=>{return Object.assign({transpiler:'espower',version:'${pkg.version}',content,filepath,line},extra,_pwptn1[ptnidx]);};`
    ]
  });

  testGeneratedCode({
    suite: 'custom config generation',
    input: 'assert(falsy);',
    espowerOptions: {
      patterns: [
        {
          pattern: 'assert(value, [message])',
          params: [
            { name: 'value', options: { depth: 2 } },
            { name: 'message', message: true }
          ]
        },
        {
          pattern: 'assert.regex(re, a, b)',
          params: [
            { name: 're', regex: /^re/ },
            { name: 'a', foo: undefined, bar: null, minus: -1, edge: -0 },
            { name: 'b', 'kebab-case': 'foo-bar' }
          ]
        }
      ]
    },
    prelude: [
      `var _pwptn1=JSON.parse('[{"pattern":"assert(value, [message])","params":[{"index":0,"name":"value","kind":"mandatory","options":{"depth":2}},{"index":1,"name":"message","kind":"optional","message":true}]},{"pattern":"assert.regex(re, a, b)","params":[{"index":0,"name":"re","kind":"mandatory","regex":{}},{"index":1,"name":"a","kind":"mandatory","bar":null,"minus":-1,"edge":0},{"index":2,"name":"b","kind":"mandatory","kebab-case":"foo-bar"}]}]');`,
      `var _pwmeta1=(ptnidx,content,filepath,line,extra)=>{return Object.assign({transpiler:'espower',version:'${pkg.version}',content,filepath,line},extra,_pwptn1[ptnidx]);};`
    ]
  });
});
