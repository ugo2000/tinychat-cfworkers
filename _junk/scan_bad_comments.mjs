import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
// Find comment lines that contain code structures (if/for/while/function/{/}) — damaged comments
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const t = line.trim();
  if (t.startsWith('//')) {
    // check if the comment body contains code-like content
    const body = t.substring(2);
    if (/[{}]/.test(body) || /\b(if|for|while|function|async|return|const|let|var)\s*\(/.test(body) || /=>/.test(body)) {
      console.log('L' + (i+1) + ': ' + JSON.stringify(line));
    }
  }
}
