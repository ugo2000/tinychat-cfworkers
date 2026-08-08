import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
// Replace </script> with </scr + "ipt>
// This prevents esbuild from seeing the closing tag while rendering correctly in browser
// Template literal eval: "</scr" + "ipt>" = "</script>"
const fixed = s.replace(/<\\/script>/g, "</scr" + "ipt>");
const count = (s.match(/<\\/script>/g) || []).length;
writeFileSync('src/html.js', fixed);
console.log('Replaced', count, 'occurrences');
console.log('New size:', fixed.length);
const newS = readFileSync('src/html.js', 'utf8');
const remaining = (newS.match(/<\\/script>/g) || []).length;
console.log('Remaining </script>:', remaining);
