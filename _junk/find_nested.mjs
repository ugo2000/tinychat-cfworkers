import { readFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
// Find lines with nested backtick templates like ZH=` or EN=`
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('=`')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
