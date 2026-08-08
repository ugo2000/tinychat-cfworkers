import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('src/index_src.js', 'utf8');
let nonAscii = 0;
for (let i = 0; i < s.length; i++) {
  if (s.charCodeAt(i) > 127) nonAscii++;
}
console.log('Total non-ASCII chars:', nonAscii);

// Remove non-ASCII from EVERYTHING (safe since code is all ASCII)
const cleaned = s.replace(/[^\x00-\x7F]/g, '');
console.log('Removed', nonAscii, 'non-ASCII chars');
console.log('Cleaned size:', cleaned.length, '(was', s.length + ')');
writeFileSync('src/index_src.js', cleaned);
console.log('Written cleaned src/index_src.js');

// Verify: count non-ASCII again
let remaining = 0;
for (let i = 0; i < cleaned.length; i++) {
  if (cleaned.charCodeAt(i) > 127) remaining++;
}
console.log('Remaining non-ASCII:', remaining);
