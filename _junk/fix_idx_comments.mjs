import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('src/index.js', 'utf8');
const lines = s.split('\n');

// Find lines with mojibake (U+FFFD replacement character)
let fixedLines = lines.map((line, i) => {
  if (line.includes('\uFFFD')) {
    const lineNum = i + 1;
    // Determine the correct clean comment based on context
    if (line.includes('pay-config') || line.includes('\u6536\u6b3e\u7801')) {
      return `    // Pay config: forward to DO (DO handles storage)`;
    }
    if (line.includes('pay-qr') || line.includes('\u7ba1\u7406\u5458')) {
      return `    // Admin QR code management (pwd auth)`;
    }
    return `    // [FIXED: mojibake removed]`;
  }
  return line;
});

const fixed = fixedLines.join('\n');
const mojibake = (fixed.match(/\uFFFD/g) || []).length;
console.log('Remaining mojibake (U+FFFD):', mojibake);
writeFileSync('src/index.js', fixed);
console.log('Written. Size:', fixed.length);
