import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
// Replace </script> with </scr${''}ipt>
// In a template literal this renders as </script> at runtime
// but prevents esbuild from seeing the closing tag during parsing
const replacement = String.raw`</scr${''}ipt>`;
const fixed = s.replace(/<\/script>/g, replacement);
const count = (s.match(/<\/script>/g) || []).length;
writeFileSync('src/html.js', fixed);
console.log('Replacements:', count);
console.log('Done. New size:', fixed.length);
const newS = readFileSync('src/html.js', 'utf8');
console.log('Remaining </script>:', (newS.match(/<\/script>/g) || []).length);
console.log('Has ${empty}:', newS.includes(replacement));
