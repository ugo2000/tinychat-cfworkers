import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('src/index.js', 'utf8');
const before = (s.match(/\uFFFD/g) || []).length;
console.log('U+FFFD mojibake count before:', before);

// Replace U+FFFD (replacement character) with empty string
const fixed = s.replace(/\uFFFD/g, '');
const after = (fixed.match(/\uFFFD/g) || []).length;
console.log('U+FFFD count after:', after);

writeFileSync('src/index.js', fixed);
console.log('Written. New size:', fixed.length);
