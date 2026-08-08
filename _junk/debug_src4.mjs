import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
let depth = 0, inStr = false, inML = false;
const orphans = [];
let i = 0;
while (i < s.length) {
  const c = s[i];
  if (!inML && (c === '"' || c === "'")) {
    inStr = !inStr;
    i++;
  } else if (!inStr && c === '`') {
    inML = !inML;
    i++;
  } else if (inML && c === '\\' && i + 1 < s.length && s[i+1] === '`') {
    i += 2; // skip \`
  } else if (!inStr && !inML && i < s.length - 1 && s[i] === '/' && s[i+1] === '/') {
    while (i < s.length && s[i] !== '\n') i++;
  } else if (!inStr && !inML && i < s.length - 1 && s[i] === '/' && s[i+1] === '*') {
    i += 2;
    while (i < s.length - 1 && !(s[i] === '*' && s[i+1] === '/')) i++;
    i += 2;
  } else if (!inStr && !inML) {
    if (c === '{') depth++;
    else if (c === '}') { depth--; if(depth < 0) orphans.push(i); }
    i++;
  } else {
    i++;
  }
}
console.log('Balance:', depth, 'Orphans:', orphans.length);
if (orphans.length > 0) {
  orphans.slice(0,3).forEach(idx => {
    const start = Math.max(0, idx-80);
    console.log('  [' + idx + ']: ...' + s.substring(start, idx+1));
  });
}
