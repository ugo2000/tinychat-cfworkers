import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
const sc = (s.match(/<\/script>/gi) || []).length;
console.log('Bare </script> count:', sc);
const lines = s.split('\n');
// Find lines containing 'scri' near HTML content
for (let i = 1070; i <= 1080; i++) {
  if (lines[i]) {
    console.log('L' + (i+1) + ':', lines[i].substring(0, 80));
  }
}
// Count backticks
const bt = (s.match(/\`/g) || []).length;
console.log('Backticks:', bt);
