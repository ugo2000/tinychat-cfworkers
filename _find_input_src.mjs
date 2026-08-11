import { readFileSync } from 'fs';
const src = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');
const lines = src.split('\n');

// Find connectWS, init handling, msgInput references in source
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('msgInput') || lines[i].includes('connectWS') || lines[i].includes("type==='init'") || lines[i].includes("msg.type === 'init'")) {
    console.log('L' + (i+1) + ': ' + lines[i].substring(0, 200));
  }
}
