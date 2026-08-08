import { readFileSync, writeFileSync } from 'fs';

// Insert zero-width non-joiner (U+200C) between </sc and ript>
// This prevents esbuild's HTML scanner from matching </script>
// while the browser renders it correctly as </script> (ZWNJ is invisible)
// Pattern: </scr\u200Cipt>
const s = readFileSync('src/html.js', 'utf8');
const before = (s.match(/<\/script>/g) || []).length;
console.log('Before: </script> count =', before);

// Replace </script> with </scr\u200Cipt> (zero-width non-joiner between scr and ipt)
const fixed = s.replace(/<\/script>/g, '</scr\u200Cipt>');

const after = (fixed.match(/<\/script>/g) || []).length;
const withZwnj = (fixed.match(/<\/scr[\u200C\u200D]ipt>/g) || []).length;
console.log('After: </script> count =', after);
console.log('With ZWNJ: ', withZwnj);

writeFileSync('src/html.js', fixed);
console.log('Written. Size:', fixed.length);

// Verify
const verify = readFileSync('src/html.js', 'utf8');
const plain = (verify.match(/<\/script>/g) || []).length;
console.log('Verify plain </script>:', plain);
