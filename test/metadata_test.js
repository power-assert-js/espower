const { testGeneratedCode } = require('./helper');

describe('metadata generator function', () => {
  testGeneratedCode({
    suite: 'default case',
    input: 'assert(falsy);',
    espowerOptions: {
      patterns: ['assert(value, [message])']
    },
    prelude: [
      'var _pwmeta1=(ptnidx,content,filepath,line,extra)=>{',
      'const version=2,patterns=[',
      '{',
      "pattern:'assert(value, [message])',",
      'args:[',
      "{index:0,name:'value',kind:'mandatory'},",
      "{index:1,name:'message',kind:'optional',message:true}",
      ']',
      '}',
      '];',
      'return Object.assign({version,content,filepath,line},extra,patterns[ptnidx]);',
      '};'
    ]
  });

  testGeneratedCode({
    suite: 'custom config generation',
    input: 'assert(falsy);',
    espowerOptions: {
      patterns: [
        {
          pattern: 'assert(value, [message])',
          args: [
            { name: 'value', options: { depth: 2 } },
            { name: 'message', message: true }
          ]
        },
        {
          pattern: 'assert.regex(re, a, b)',
          args: [
            { name: 're', regex: /^re/ },
            { name: 'a', foo: undefined, bar: null, minus: -1, edge: -0 },
            { name: 'b', 'kebab-case': 'foo-bar' }
          ]
        }
      ]
    },
    prelude: [
      'var _pwmeta1=(ptnidx,content,filepath,line,extra)=>{',
      'const version=2,patterns=[',
      '{',
      "pattern:'assert(value, [message])',",
      'args:[',
      "{index:0,name:'value',kind:'mandatory',options:{depth:2}},",
      "{index:1,name:'message',kind:'optional',message:true}",
      ']',
      '},',
      '{',
      "pattern:'assert.regex(re, a, b)',",
      'args:[',
      "{index:0,name:'re',kind:'mandatory',regex:/^re/},",
      "{index:1,name:'a',kind:'mandatory',foo:undefined,bar:null,minus:-1,edge:-0},",
      "{index:2,name:'b',kind:'mandatory','kebab-case':'foo-bar'}",
      ']',
      '}',
      '];',
      'return Object.assign({version,content,filepath,line},extra,patterns[ptnidx]);',
      '};'
    ]
  });
});
