import { readFileSync, writeFileSync } from 'fs';
// Restore html_src.js from html.js (pristine backup, same size), then escape exactly the 8 inner backticks
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/';
const orig = readFileSync(base + 'html.js', 'utf8');
const cur = readFileSync(base + 'html_src.js', 'utf8');
console.log('html.js length:', orig.length, 'html_src.js length (corrupted):', cur.length);
console.log('html.js === html_src.js?', orig === cur);

// Find inner backticks in html.js: backticks NOT preceded by '= ' (open) or '</html>' (close)
let out = '';
let escaped = 0;
for (let i = 0; i < orig.length; i++) {
  const c = orig[i];
  if (c === '`') {
    const prev2 = out.substring(out.length - 2);
    const prev7 = out.substring(out.length - 7);
    if (prev2 === '= ' || prev7 === '</html>') {
      out += c; // real template delimiter
    } else {
      out += '\\`';
      escaped++;
    }
  } else {
    out += c;
  }
}
console.log('Escaped inner backticks:', escaped, '(expect 8)');
writeFileSync(base + 'html_src.js', out);
console.log('New length:', out.length, '(expect', orig.length + 8 + ')');
// Verify import
import('data:text/javascript;base64,' + Buffer.from(out).toString('base64')).then(m => {
  console.log('IMPORT OK. Exports:', Object.keys(m));
  for (const k of Object.keys(m)) {
    if (typeof m[k] === 'string') {
      console.log(k, 'len:', m[k].length, 'has </script>:', m[k].includes('</script>'), 'has </html>:', m[k].includes('</html>'));
    }
  }
}).catch(e => console.log('IMPORT FAIL:', e.message));
