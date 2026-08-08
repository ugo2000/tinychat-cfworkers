import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');

// Find and remove Chinese comment lines that have { or } after //
const lines = s.split('\n');
const badLines = [];
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t.startsWith('//') && /[^\x00-\x7F]/.test(t)) {
    // Has Chinese in comment - check for structural chars
    const afterSlashSlash = t.substring(2);
    if (/[{}\(\);]/.test(afterSlashSlash)) {
      badLines.push(i+1);
      lines[i] = '___REMOVE___';
    }
  }
}
console.log('Bad lines:', badLines.join(', '));

// Remove trailing orphan }
let content = lines.join('\n');
if (content.endsWith('}\n')) {
  content = content.substring(0, content.length - 1);
  console.log('Removed trailing orphan }');
}

// Verify
let depth = 0, inStr = false, inML = false;
for (let i = 0; i < content.length; i++) {
  const c = content[i];
  if (!inML && (c === '"' || c === "'")) inStr = !inStr;
  else if (!inStr && c === '`') inML = !inML;
  else if (inML && c === '\\') i++;
  else if (!inStr && !inML && i < content.length-1 && content[i] === '/' && content[i+1] === '/') { while (i < content.length && content[i] !== '\n') i++; }
  else if (!inStr && !inML) { if (c==='{') depth++; else if (c==='}') depth--; }
}
console.log('Brace balance:', depth);
if (depth !== 0) {
  console.log('ERROR: Still unbalanced');
  process.exit(1);
}

writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', content);
console.log('Fixed! Written to index_src.js');
