import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');
const re = /const\s+(HTML|ADMIN_HTML|TEST_HTML|ABOUT_HTML|PRICING_HTML|ZH|EN)\s*=/g;
let m;
while ((m = re.exec(s)) !== null) {
  const lineNo = s.substring(0, m.index).split('\n').length;
  console.log('const', m[1], 'at char', m.index, 'line', lineNo);
}
const re2 = /String\.fromCharCode\(96\)/g;
let count = 0;
while ((m = re2.exec(s)) !== null) {
  const lineNo = s.substring(0, m.index).split('\n').length;
  console.log('fromCharCode(96) at char', m.index, 'line', lineNo, 'ctx:', JSON.stringify(s.substring(m.index-25, m.index+35)));
  count++;
}
console.log('Total fromCharCode(96):', count);
console.log('Backticks:', (s.match(/\x60/g)||[]).length);
console.log('Total length:', s.length);
