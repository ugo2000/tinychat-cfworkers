import { readFileSync } from 'fs';
const s = readFileSync('src/index.js', 'utf8');
const lines = s.split('\n');
// Show lines 1-50 with all characters visible
for (let i = 0; i < 50; i++) {
  const line = lines[i];
  // Show invisible chars
  let display = line
    .replace(/\t/g, '→T←')
    .replace(/ /g, '·')
    .replace(/\r/g, '⏎');
  console.log(`${String(i+1).padStart(3)} [${display}]`);
  if (line.length > 0 && (i === 25 || i === 31)) {
    // Check for unusual chars
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      const code = line.charCodeAt(c);
      if (code > 127 || code < 32) {
        console.log(`  char[${c}] = U+${code.toString(16).toUpperCase().padStart(4,'0')} "${ch}"`);
      }
    }
  }
}
