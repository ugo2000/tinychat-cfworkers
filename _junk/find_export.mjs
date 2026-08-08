import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (/\bexport\b/.test(lines[i])) {
    console.log('L' + (i+1) + ': ' + lines[i].trim().substring(0, 80));
  }
}
