import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');
// Show raw bytes around 48355 (const ZH) and 50454 (const EN) and 55825, 57275
for (const pos of [48355, 50454, 55825, 57275]) {
  console.log('=== pos', pos, '===');
  console.log(JSON.stringify(s.substring(pos - 60, pos + 120)));
}
// Also show where each const closes - find backticks
console.log('\nAll backtick positions:');
let idx = 0;
while ((idx = s.indexOf('`', idx)) !== -1) {
  const lineNo = s.substring(0, idx).split('\n').length;
  console.log('backtick at', idx, 'line', lineNo, 'prev:', JSON.stringify(s.substring(idx-15, idx)), 'next:', JSON.stringify(s.substring(idx, idx+15)));
  idx++;
}
