import { readFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
const scriptCount = (s.match(/<\/script>/g) || []).length;
const emptyCount = (s.match(/<\/scr\$\{''\}ipt>/g) || []).length;
const concatCount = (s.match(/<\/scr" \+ "ipt>/g) || []).length;
console.log('Plain </script>:', scriptCount);
console.log('${empty} pattern:', emptyCount);
console.log('String concat pattern:', concatCount);
console.log('File size:', s.length);
