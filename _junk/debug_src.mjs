import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
let depth = 0, inStr = false, inML = false;
const orphans = [];
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
    else if (c === '}') { depth--; if(depth < 0) orphans.push(i); }
  }
}
console.log('Balance:', depth, 'Orphans:', orphans.length);
orphans.slice(-5).forEach(idx => {
  const start = Math.max(0, idx-50);
  console.log('  [' + idx + ']: ...' + s.substring(start, idx+1));
});
// Also: find the actual structure. What function/class is at the end?
// Show the last 300 chars
console.log('\nLast 300 chars:');
console.log(s.substring(s.length - 300));
// Show last 20 lines
const lines = s.split('\n');
console.log('\nLast 20 lines:');
lines.slice(-20).forEach((l, i) => console.log(`L${lines.length-20+i+1}: ${l}`));
