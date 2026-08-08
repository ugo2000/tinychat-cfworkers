import { readFileSync, writeFileSync } from 'fs';
// Remove non-ASCII from comment lines only (keep in strings), then check balance
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
let fixed = [];
let removed = 0;
for (let li = 0; li < lines.length; li++) {
  let line = lines[li];
  const t = line.trim();
  if (t.startsWith('//')) {
    const cleaned = line.replace(/[^\x00-\x7F]/g, '');
    if (cleaned.trim() !== t.replace(/[^\x00-\x7F]/g, '').trim() || line !== cleaned) removed++;
    line = cleaned || '___DELETED___';
  }
  fixed.push(line);
}
let content = fixed.join('\n').replace(/^___DELETED___\n/gm, '');
console.log('Removed', removed, 'comment lines with non-ASCII chars');
// Verify brace balance
let depth=0, inStr=false, inML=false, strChar='', i=0;
while (i < content.length) {
  const c = content[i];
  if (inStr) {
    if (c === '\\' && i+1 < content.length) i += 2;
    else if (c === strChar) inStr = false;
    i++; continue;
  }
  if (inML) {
    if (c === '\\' && i+1 < content.length) i += 2;
    else if (c === '`') inML = false;
    i++; continue;
  }
  if (c === '`') { inML = true; i++; continue; }
  if (c === '"' || c === "'") { inStr = true; strChar = c; i++; continue; }
  if (c === '/' && i+1 < content.length && content[i+1] === '/') { while (i < content.length && content[i] !== '\n') i++; continue; }
  if (c === '/' && i+1 < content.length && content[i+1] === '*') { i+=2; while (i < content.length-1 && !(content[i]==='*'&&content[i+1]==='/')) i++; i++; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth < 0) { const ln = content.substring(0,i).split('\n').length; console.log('ORPHAN at line',ln,'ctx:', JSON.stringify(content.substring(Math.max(0,i-60),i+30))); depth = 0; } }
  i++;
}
console.log('Brace balance:', depth);
writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src_ascii.js', content);
console.log('Written index_src_ascii.js, length:', content.length);
