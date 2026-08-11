import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const content = readFileSync(base + 'src/html_src.js', 'utf8');
const lines = content.split('\n');
// Find lines with </script> or close to it
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('scr') || lines[i].includes('ipt>') || lines[i].includes('body') || lines[i].includes('html')) {
    console.log('L' + (i + 1) + ':', JSON.stringify(lines[i]));
  }
}
