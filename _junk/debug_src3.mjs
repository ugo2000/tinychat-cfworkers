import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
let depth = 0, inStr = false, inML = false;
const orphans = [];
// Track which positions are problematic
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  // String literals
  if (!inML && (c === '"' || c === "'")) {
    inStr = !inStr;
  }
  // Template literals (properly handle \` escape)
  else if (!inStr && c === '`') {
    inML = !inML;
  }
  // Handle \` escape within template literal
  else if (inML && c === '\\' && i + 1 < s.length && s[i+1] === '`') {
    i++; // skip both \ and `
  }
  // Line comments
  else if (!inStr && !inML && i < s.length - 1 && s[i] === '/' && s[i+1] === '/') {
    while (i < s.length && s[i] !== '\n') i++;
  }
  // Block comments
  else if (!inStr && !inML && i < s.length - 1 && s[i] === '/' && s[i+1] === '*') {
    i += 2;
    while (i < s.length && !(s[i] === '*' && s[i+1] === '/')) i++;
    i++; // skip */
  }
  // Braces
  else if (!inStr && !inML) {
    if (c === '{') depth++;
    else if (c === '}') { depth--; if(depth < 0) orphans.push(i); }
  }
}
console.log('Balance:', depth, 'Orphans:', orphans.length);
if (orphans.length > 0) {
  orphans.slice(0,3).forEach(idx => {
    const start = Math.max(0, idx-60);
    console.log('  [' + idx + ']: ...' + s.substring(start, idx+1));
  });
}
