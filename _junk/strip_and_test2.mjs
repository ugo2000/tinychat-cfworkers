import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
let fixed = [];
for (let li = 0; li < lines.length; li++) {
  let line = lines[li];
  const t = line.trim();
  if (t.startsWith('//')) {
    const cleaned = line.replace(/[^\x00-\x7F]/g, '');
    line = cleaned || '';
  }
  fixed.push(line);
}
let content = fixed.join('\n');
// Remove trailing orphan }
if (content.endsWith('}\n')) {
  content = content.substring(0, content.length - 1);
  console.log('Removed trailing orphan }');
}
// Verify balance
let depth=0, inStr=false, inML=false, strChar='', i=0;
while (i < content.length) {
  const c = content[i];
  if (inStr) { if (c==='\\'&&i+1<content.length) i+=2; else if (c===strChar) inStr=false; i++; continue; }
  if (inML) { if (c==='\\'&&i+1<content.length) i+=2; else if (c==='`') inML=false; i++; continue; }
  if (c==='`') { inML=true; i++; continue; }
  if (c==='"'||c==="'") { inStr=true; strChar=c; i++; continue; }
  if (c==='/'&&i+1<content.length&&content[i+1]==='/'){while(i<content.length&&content[i]!='\n')i++;continue;}
  if (c==='/'&&i+1<content.length&&content[i+1]==='*'){i+=2;while(i<content.length-1&&!(content[i]==='*'&&content[i+1]==='/'))i++;i++;continue;}
  if (c==='{') depth++;
  else if (c==='}') depth--;
  i++;
}
console.log('Brace balance:', depth);
if (depth !== 0) { console.log('ERROR'); process.exit(1); }
// Test with esbuild
writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src_clean.js', content);
console.log('Written index_src_clean.js (' + content.length + ' bytes)');
