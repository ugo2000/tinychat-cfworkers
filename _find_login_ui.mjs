import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');
// Find the login page section in HTML template
let idx = s.indexOf('pageLogin');
while (idx !== -1 && idx < 40000) {
  console.log('=== @' + idx + ' ===');
  console.log(s.substring(idx - 100, idx + 800));
  idx = s.indexOf('pageLogin', idx + 1);
}
