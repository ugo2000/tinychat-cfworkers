import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');
// find startup / DOMContentLoaded logic
let idx = s.indexOf('DOMContentLoaded');
console.log('DOMContentLoaded at:', idx);
if (idx > 0) console.log(s.substring(idx - 200, idx + 900));
