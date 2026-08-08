import { readFileSync, writeFileSync } from 'fs';
let html = readFileSync('src/html.js', 'utf8');
const lines = html.split('\n');

// Remove only the WRONG `};` lines (those added before </script> in the main HTML)
// Keep the correct one for TEST_HTML
// L900 and L1461 are wrong (main HTML); L1666 is correct (TEST_HTML)
// These are 1-indexed, filter uses 0-indexed
const wrong = new Set([899, 1460]); // 0-indexed
const fixed = lines.filter((_, i) => !wrong.has(i));
console.log('Removed lines 900, 1461 (1-idx). New total:', fixed.length);

// Verify structure
let inMain = 0, inAdmin = 0;
for (let i = 0; i < fixed.length; i++) {
  const l = fixed[i].trim();
  if (l.match(/^const [A-Z_]+ = `/)) console.log(`L${i+1}: ${l.substring(0,40)}`);
}

writeFileSync('src/html.js', fixed.join('\n'), 'utf8');
console.log('done');
