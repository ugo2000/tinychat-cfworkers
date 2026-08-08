import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
let depth = 0, inStr = false, inML = false, strChar = '';
let line = 1;
let i = 0;
const lineMap = [];
while (i < s.length) {
  if (s[i] === '\n') lineMap.push(i);
  i++;
}
function lineOf(pos) {
  let lo = 0, hi = lineMap.length-1;
  while (lo < hi) { const m = (lo+hi)>>1; if (lineMap[m] < pos) lo=m+1; else hi=m; }
  return lo+1;
}
depth = 0; inStr = false; inML = false; strChar = '';
i = 0;
while (i < s.length) {
  const c = s[i];
  if (inStr && c === '\\' && i+1 < s.length) { i += 2; continue; }
  if (inStr && c === strChar) { inStr = false; i++; continue; }
  if (!inStr && !inML && (c === '"' || c === "'")) { inStr = true; strChar = c; i++; continue; }
  if (!inStr && !inML && c === '`') { inML = !inML; i++; continue; }
  if (!inStr && !inML && c === '/' && i+1 < s.length && s[i+1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
  if (!inStr && !inML && c === '/' && i+1 < s.length && s[i+1] === '*') { i+=2; while (i < s.length-1 && !(s[i]==='*'&&s[i+1]==='/')) i++; i+=2; continue; }
  if (!inStr && !inML) {
    if (c === '{') { depth++; }
    else if (c === '}') { depth--; if (depth < 0) { console.log('ORPHAN L' + lineOf(i) + ' pos=' + i + ' depth=' + depth + ' context: ' + JSON.stringify(s.substring(i-30, i+30))); } }
  }
  i++;
}
console.log('Final depth:', depth);
console.log('Line:', lineOf(s.length));
