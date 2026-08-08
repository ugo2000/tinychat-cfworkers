import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');
// Print the ZH/EN workaround section fully (ABOUT_HTML inline script)
console.log('=== ABOUT_HTML inline script section (48200-53100) ===');
console.log(s.substring(48200, 53100));
