import { readFileSync, writeFileSync } from 'fs';

// Read the current bundled index.js and write a clean UTF-8 version
const data = readFileSync('src/index.js');
// Write as clean UTF-8 (strip any BOM)
const clean = Buffer.from(data.toString('utf8'), 'utf8');
writeFileSync('src/index.js', clean);
console.log('Written clean UTF-8, size:', clean.length);
// Verify
const s = readFileSync('src/index.js', 'utf8');
const scriptCount = (s.match(/<\/script>/gi) || []).length;
console.log('</script> count:', scriptCount);
console.log('First 100:', s.substring(0, 100));
