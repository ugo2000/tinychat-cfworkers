import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
let b = 0, br = 0, pa = 0, bt = 0;
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (ch === '{') b++;
  else if (ch === '}') b--;
  else if (ch === '[') br++;
  else if (ch === ']') br--;
  else if (ch === '(') pa++;
  else if (ch === ')') pa--;
  else if (ch === '`') bt++;
}
console.log('At EOF - braces:', b, 'brackets:', br, 'parens:', pa, 'backticks:', bt);
console.log('Total length:', s.length);

// Show lines around 1130-1140
const lines = s.split('\n');
for (let i = 1128; i <= 1142; i++) {
  console.log(`L${i+1}: ${lines[i]}`);
}
