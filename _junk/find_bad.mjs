import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t.startsWith('//')) {
    const hasNonAscii = /[^\x00-\x7F]/.test(t);
    if (hasNonAscii) {
      console.log('L' + (i+1) + ': ' + t + ' -> has {:' + t.includes('{'));
    }
  }
}
