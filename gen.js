const { join } = require('path');
const { readFileSync, writeFileSync } = require('fs');
const { parse } = require('acorn');
const espurify = require('espurify');

const dump = (name) => {
  const filepath = join(__dirname, 'templates', `${name}.js`);
  const templateLines = readFileSync(require.resolve(filepath), 'utf8').split('\n');
  const funcBody = templateLines.slice(2, templateLines.length - 2).join('\n'); // extract template body
  const ast = parse(`(function () { ${funcBody} })()`, { ecmaVersion: 6 });
  const callexp = espurify(ast).body[0].expression;
  writeFileSync(join(__dirname, 'lib', 'templates', `${name}.json`), JSON.stringify(callexp, null, 2));
};

dump('argument-recorder');
dump('assertion-message');
