import { readFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
const idx = s.indexOf("</scr" + "ipt>");
console.log('Replacement at:', idx);
if (idx >= 0) console.log('Context:', s.substring(idx - 5, idx + 40));
console.log('Remaining </script>:', (s.match(/<\/script>/g) || []).length);
console.log('Replacement count:', (s.match(/<\/scr" + "ipt>/g) || []).length);
