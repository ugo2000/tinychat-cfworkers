import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
let depth = 0, inStr = false, inML = false;
let i = 0;
while (i < s.length) {
  const c = s[i];
  if (!inML && (c === '"' || c === "'")) { inStr = !inStr; i++; }
  else if (!inStr && c === '`') { inML = !inML; i++; }
  else if (inML && c === '\\' && i+1 < s.length) { i += 2; } // skip any escaped char in template
  else if (!inStr && !inML && i < s.length-1 && s[i] === '/' && s[i+1] === '/') { while (i < s.length && s[i] !== '\n') i++; }
  else if (!inStr && !inML && i < s.length-1 && s[i] === '/' && s[i+1] === '*') { i+=2; while (i < s.length-1 && !(s[i]==='*'&&s[i+1]==='/')) i++; i+=2; }
  else if (!inStr && !inML) { if (c==='{') depth++; else if (c==='}') depth--; i++; }
  else i++;
}
console.log('Real balance:', depth);
