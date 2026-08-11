const s = require('fs').readFileSync('src/html_src.js', 'utf8');
const matches = [...s.matchAll(/function applyI18n/g)];
console.log('applyI18n count:', matches.length, matches.map(m => m.index));
