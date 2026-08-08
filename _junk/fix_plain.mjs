import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
// Restore </script> (undo the hex escape)
const fixed = s.replace(/\\x3c\/script>/g, "</script>");
const count = (s.match(/\\x3c\/script>/g) || []).length;
writeFileSync('src/html.js', fixed);
console.log('Restored', count, 'occurrences');
console.log('Size:', fixed.length);
const newS = readFileSync('src/html.js', 'utf8');
console.log('Plain </script>:', (newS.match(/<\/script>/g) || []).length);
console.log('Escaped \\x3c/script>:', (newS.match(/\\x3c/g) || []).length);
