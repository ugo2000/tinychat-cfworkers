import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');
// Find startup logic - look for showPage / init calls near end of HTML template
for (const kw of ['showPage(', 'startChat(', 'init(', 'localStorage.getItem']) {
  let idx = s.indexOf(kw);
  let n = 0;
  while (idx !== -1 && n < 12) {
    console.log('=== ' + kw + ' @' + idx + ' ===');
    console.log(s.substring(idx - 120, idx + 200).replace(/\n/g, '\n'));
    idx = s.indexOf(kw, idx + 1);
    n++;
  }
  console.log('---');
}
