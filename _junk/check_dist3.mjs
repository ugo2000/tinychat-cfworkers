import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
// Find all </scr occurrences
let idx = s.indexOf('</scr');
const matches = [];
while (idx >= 0 && matches.length < 10) {
  matches.push({pos: idx, text: s.substring(idx, idx + 30)});
  idx = s.indexOf('</scr', idx + 1);
}
console.log('Found', matches.length, '</scr occurrences');
matches.forEach((m, i) => console.log(i, 'pos:', m.pos, 'text:', JSON.stringify(m.text)));

// Also find what the actual closing tag looks like
const htmlClose = s.indexOf('</body>');
console.log('\n</body> at:', htmlClose, JSON.stringify(s.substring(htmlClose - 10, htmlClose + 15)));
