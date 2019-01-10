var path = require('path');
var fs = require('fs');
var acorn = require('acorn');
var espurify = require('espurify');

var filepath = path.join(__dirname, 'power-assert-recorder.js');
var ast = acorn.parse(fs.readFileSync(filepath), { ecmaVersion: 6, locations: true });
var callexp = espurify(ast).body[0].expression.right;
fs.writeFileSync(path.join(__dirname, 'lib', 'power-assert-recorder.json'), JSON.stringify(callexp, null, 2));
