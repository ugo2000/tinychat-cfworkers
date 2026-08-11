import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

// 1. Fetch home page
const html = execSync('curl.exe -s https://chathub.asia/', { encoding: 'utf8' });
writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/_home_live.html', html, 'utf8');
const s = html.indexOf('<script>');
const split = html.indexOf("</scr'+'ipt>");
const script = html.substring(s + 8, split);
writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/_home_script.js', script, 'utf8');

// 2. Collect all id="..." from HTML body
const ids = new Set();
const re = /id="([^"]+)"/g;
let m;
while ((m = re.exec(html)) !== null) ids.add(m[1]);

// 3. Collect all getElementById('...') / getElementById("...") refs in script
const refs = new Set();
const re2 = /getElementById\(['"]([^'"]+)['"]\)/g;
while ((m = re2.exec(script)) !== null) refs.add(m[1]);

// 4. Also querySelector('#...') refs
const re3 = /querySelector\(['"]#([^'"]+)['"]\)/g;
while ((m = re3.exec(script)) !== null) refs.add(m[1]);

console.log('HTML ids:', ids.size, '| script refs:', refs.size);
console.log('\n=== refs NOT found in HTML (runtime null risk) ===');
let missing = 0;
for (const r of [...refs].sort()) {
  if (!ids.has(r)) { console.log('  MISSING:', r); missing++; }
}
if (!missing) console.log('  (none - all refs exist)');

// 5. Check function definitions referenced but never defined
const called = new Set();
const re4 = /(?:onclick|onchange|onkeydown|onkeyup|onfocus|onblur)="([a-zA-Z_$][\w$]*)\(/g;
while ((m = re4.exec(html)) !== null) called.add(m[1]);
const re5 = /\b([a-zA-Z_$][\w$]*)\s*\(/g;
while ((m = re5.exec(script)) !== null) {
  // only top-level-ish calls, skip common keywords
  if (!['if','for','while','switch','catch','function','return','typeof','new','throw','else','do','case','in','of','var','let','const','await','yield'].includes(m[1])) called.add(m[1]);
}
const defined = new Set();
const re6 = /function\s+([a-zA-Z_$][\w$]*)/g;
while ((m = re6.exec(script)) !== null) defined.add(m[1]);
const re6b = /(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^;]*=>/g;
while ((m = re6b.exec(script)) !== null) defined.add(m[1]);

console.log('\n=== functions called but never defined in script ===');
let undef = 0;
for (const c of [...called].sort()) {
  if (!defined.has(c)) { console.log('  UNDEFINED:', c); undef++; }
}
if (!undef) console.log('  (none)');
console.log('\nTotal script length:', script.length, '| lines:', script.split('\n').length);
