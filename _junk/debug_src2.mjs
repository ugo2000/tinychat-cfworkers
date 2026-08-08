import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
let depth = 0, inStr = false, inML = false;
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (!inML && (c === '"' || c === "'")) inStr = !inStr;
  else if (!inML && c === '`') inML = true;
  else if (inML && c === '`') inML = false;
  else if (!inStr && !inML && i < s.length - 1 && s[i] === '/' && s[i+1] === '/') {
    while (i < s.length && s[i] !== '\n') i++;
  }
  else if (!inStr && !inML) {
    if (c === '{') depth++;
    else if (c === '}') { depth--; if(depth === -1) { console.log('FIRST orphan at', i); console.log('Context:', s.substring(Math.max(0,i-120),i+50)); i = s.length; } }
  }
}
