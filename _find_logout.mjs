import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');
let idx = s.indexOf('btnLogout');
while (idx !== -1) {
  console.log('=== btnLogout @' + idx + ' ===');
  console.log(JSON.stringify(s.substring(idx - 300, idx + 150)));
  idx = s.indexOf('btnLogout', idx + 1);
}
// CSS for logout-btn
idx = s.indexOf('logout-btn');
while (idx !== -1) {
  console.log('=== logout-btn CSS @' + idx + ' ===');
  console.log(JSON.stringify(s.substring(idx - 50, idx + 150)));
  idx = s.indexOf('logout-btn', idx + 1);
}
