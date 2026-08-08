import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
// Replace </script> with \x3c/script> (hex escape for <) 
// This renders as </script> in the browser (JS string \x3c = '<')
// but prevents the HTML parser from prematurely closing <script> blocks
const fixed = s.replace(/<\/script>/g, "\\x3c/script>");
const count = (s.match(/<\/script>/g) || []).length;
writeFileSync('src/html.js', fixed);
console.log('Replaced', count, 'occurrences');
console.log('New size:', fixed.length);
const newS = readFileSync('src/html.js', 'utf8');
const remaining = (newS.match(/<\/script>/g) || []).length;
const escaped = (newS.match(/\\x3c\/script>/g) || []).length;
console.log('Remaining </script>:', remaining);
console.log('Escaped \\x3c/script>:', escaped);
