const { join } = require('path');
const fs = require('fs');
const acorn = require('acorn');
const espurify = require('espurify');

const filepath = join(__dirname, 'power-assert-recorder.js');
const ast = acorn.parse(fs.readFileSync(filepath), { ecmaVersion: 6, locations: true });
const callexp = espurify(ast).body[0].expression.right;
fs.writeFileSync(join(__dirname, 'lib', 'power-assert-recorder.json'), JSON.stringify(callexp, null, 2));
