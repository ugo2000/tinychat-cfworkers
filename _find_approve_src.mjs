import { readFileSync } from 'fs';
const src = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');
const lines = src.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('approvePay')) {
    console.log('Line', (i+1), ':', lines[i].substring(0, 400));
    console.log('---');
  }
}
