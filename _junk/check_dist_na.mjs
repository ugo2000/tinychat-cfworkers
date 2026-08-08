import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
let na = 0;
for (let i = 0; i < s.length; i++) {
  if (s.charCodeAt(i) > 127) na++;
}
console.log('dist non-ASCII:', na);
if (na > 0) {
  const lines = s.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/[^\x00-\x7F]/.test(lines[i])) {
      console.log(`L${i+1}: ${lines[i].substring(0, 60)}`);
    }
  }
}
