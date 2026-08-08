import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
const plain = (s.match(/<\/script>/g) || []).length;
const concat = (s.match(/<\/scr" \+ "ipt>/g) || []).length;
const plus = s.includes('</scr" + "ipt>');
console.log('Plain </script>:', plain);
console.log('Escaped (contains concat):', concat, plus);
console.log('Size:', s.length);
// Show context
const idx = s.indexOf('</scr" + "ipt>');
if (idx >= 0) console.log('Escaped context:', s.substring(idx - 5, idx + 40));
