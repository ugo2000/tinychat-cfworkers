import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
let depth = 0, inStr = false, inML = false, strChar = '';
let i = 0;
while (i < s.length) {
  const c = s[i];
  if (inStr && c === '\\' && i+1 < s.length) { i += 2; continue; }
  if (inStr && c === strChar) { inStr = false; i++; continue; }
  if (!inStr && !inML && (c === '"' || c === "'")) { inStr = true; strChar = c; i++; continue; }
  if (!inStr && !inStr && c === '`') { inML = !inML; i++; continue; }
  if (!inStr && !inML && c === '/' && i+1 < s.length && s[i+1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
  if (!inStr && !inML && c === '/' && i+1 < s.length && s[i+1] === '*') { i+=2; while (i < s.length-1 && !(s[i]==='*'&&s[i+1]==='/')) i++; i+=2; continue; }
  if (!inStr && !inML) {
    if (c === '{') { depth++; }
    else if (c === '}') { depth--; if (depth < 0) { console.log('ORPHAN } at', i, 'depth', depth); console.log(JSON.stringify(s.substring(Math.max(0,i-80), i+40))); depth = 0; } }
  }
  i++;
}
console.log('Final depth:', depth);
