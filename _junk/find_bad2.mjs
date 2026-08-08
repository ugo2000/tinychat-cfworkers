import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
const bad = [];
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t.startsWith('//')) {
    const hasNonAscii = /[^\x00-\x7F]/.test(t);
    if (hasNonAscii) {
      bad.push('L' + (i+1) + ': ' + t);
    }
  }
}
writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/bad_comments.txt', bad.join('\n'));
console.log('Found', bad.length, 'Chinese comment lines');
console.log(bad.join('\n'));
