import { readFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
const plain = (s.match(/<\/script>/g) || []).length;
const emptyPattern = (s.match(/<\/scr\$\{''\}ipt>/g) || []).length;
const hex = (s.match(/\\x3c/g) || []).length;
console.log('Plain </script>:', plain);
console.log('${empty} pattern:', emptyPattern);
console.log('Hex \\x3c escape:', hex);
console.log('File size:', s.length);
