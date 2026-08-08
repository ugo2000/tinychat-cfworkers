import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
for (let i = 168; i < 176; i++) console.log('L' + (i+1) + ': ' + lines[i]);
