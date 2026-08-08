import { readFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');

// Count backticks per line
const lines = s.split('\n');
const btPerLine = [];
for (let i = 0; i < lines.length; i++) {
  const cnt = (lines[i].match(/`/g) || []).length;
  if (cnt > 0) {
    btPerLine.push({ line: i + 1, cnt, snippet: lines[i].trim().substring(0, 50) });
  }
}

btPerLine.forEach(({ line, cnt, snippet }) => {
  console.log(`Line ${line}: ${cnt} backtick(s) | ${snippet}`);
});

// Total
const total = (s.match(/`/g) || []).length;
console.log('\nTotal backticks:', total);
// Templates should have even count (open + close)
console.log('Odd number of backticks (unclosed template):', total % 2 !== 0);

// Check each export block
const exports = ['HTML', 'ADMIN_HTML', 'TEST_HTML', 'ABOUT_HTML', 'PRICING_HTML'];
for (const name of exports) {
  const start = s.indexOf(`const ${name} = \``);
  if (start < 0) { console.log(`${name}: NOT FOUND`); continue; }
  // Find the closing backtick for this template
  let btCount = 1;
  let pos = start + `const ${name} = \``.length;
  let found = false;
  while (pos < s.length && !found) {
    if (s[pos] === '`') {
      if (s[pos-1] !== '\\') btCount--;
      if (btCount === 0) {
        console.log(`${name}: starts at char ${start}, ends at char ${pos}, length ${pos - start}`);
        found = true;
      }
    }
    pos++;
  }
  if (!found) console.log(`${name}: NO CLOSING BACKTICK FOUND`);
}
