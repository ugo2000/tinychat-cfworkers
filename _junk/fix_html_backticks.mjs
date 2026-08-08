import { readFileSync, writeFileSync } from 'fs';
// Fix html_src.js: escape inner raw backticks (all unescaped backticks EXCEPT the one preceded by </html>)
const p = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js';
let s = readFileSync(p, 'utf8');
let out = '';
let i = 0;
let escaped = 0;
while (i < s.length) {
  const c = s[i];
  if (c === '`') {
    // check if already escaped
    const prev = out[out.length - 1];
    if (prev === '\\') {
      // count preceding backslashes
      let bs = 0;
      let j = out.length - 1;
      while (j >= 0 && out[j] === '\\') { bs++; j--; }
      if (bs % 2 === 1) { out += c; i++; continue; } // already escaped
    }
    // check if preceded by </html> (real closing backtick)
    const before = out.substring(out.length - 7);
    if (before === '</html>') {
      out += c; i++; continue;
    }
    // inner backtick -> escape it
    out += '\\`';
    escaped++;
    i++;
    continue;
  }
  out += c;
  i++;
}
writeFileSync(p, out);
console.log('Escaped inner backticks:', escaped);
console.log('New length:', out.length);
// Count backticks now
const bt = out.match(/`/g) || [];
console.log('Raw backticks now:', bt.length, '(expect 10)');
// Verify import works
import('data:text/javascript;base64,' + Buffer.from(out).toString('base64')).then(m => {
  console.log('IMPORT OK. Exports:', Object.keys(m));
  for (const k of Object.keys(m)) {
    if (typeof m[k] === 'string') {
      console.log(k, 'len:', m[k].length, 'has </script>:', m[k].includes('</script>'), 'has </html>:', m[k].includes('</html>'));
    }
  }
}).catch(e => console.log('IMPORT FAIL:', e.message));
