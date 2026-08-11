import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const content = readFileSync(base + 'src/html_src.js', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
console.log('Total length:', content.length);
for (let i = 1523; i <= 1535; i++) console.log('L' + (i + 1) + ':', JSON.stringify(lines[i]));
