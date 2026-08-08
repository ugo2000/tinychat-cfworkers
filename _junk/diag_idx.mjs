import { readFileSync } from 'fs';
const s = readFileSync('src/index.js', 'utf8');
const lines = s.split('\n');
console.log('Total lines:', lines.length);

// Show lines 20-45 with char codes for any unusual characters
for (let i = 20; i < 45; i++) {
  const line = lines[i];
  const hasBadChars = /[^\x20-\x7E\u4E00-\u9FFF\u3000-\u303F\uFF00-\uFFEF]/.test(line);
  const special = line.replace(/[\x20-\x7E\u4E00-\u9FFF\u3000-\u303F\uFF00-\uFFEF\n\r\t ]/g, '');
  console.log(`L${i+1} (${line.length} chars)${hasBadChars ? ' [SPECIAL]' : ''}: ${JSON.stringify(line.substring(0, 100))}${special ? ' | SPECIAL:'+JSON.stringify(special) : ''}`);
}

// Check brace balance
let braceCount = 0, bracketCount = 0, parenCount = 0;
for (const ch of s) {
  if (ch === '{') braceCount++;
  if (ch === '}') braceCount--;
  if (ch === '[') bracketCount++;
  if (ch === ']') bracketCount--;
  if (ch === '(') parenCount++;
  if (ch === ')') parenCount--;
}
console.log('\nBrace balance:', braceCount, '(should be 0)');
console.log('Bracket balance:', bracketCount, '(should be 0)');
console.log('Paren balance:', parenCount, '(should be 0)');

// Check first 5 lines for BOM or unusual chars
console.log('\nFirst 5 lines:');
for (let i = 0; i < 5; i++) {
  const line = lines[i];
  console.log(`L${i+1}:`, JSON.stringify(line.substring(0, 80)));
  const bytes = Buffer.from(line);
  if (bytes[0] === 0xEF || bytes[0] === 0xFE || bytes[0] === 0xFF) {
    console.log('  BOM detected!', bytes.subarray(0, 3).toString('hex'));
  }
}
