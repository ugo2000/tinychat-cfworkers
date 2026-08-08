import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
// Remove the last character if it's an orphan }
let fixed = s;
if (s.endsWith('}\n')) {
  fixed = s.substring(0, s.length - 1);
  console.log('Removed trailing orphan }');
}
// Verify with proper string/comment tracking
let depth = 0, inStr = false, inML = false;
for (let i = 0; i < fixed.length; i++) {
  const c = fixed[i];
  if (!inML && (c === '"' || c === "'")) inStr = !inStr;
  else if (!inML && c === '`') inML = true;
  else if (inML && c === '`') inML = false;
  else if (!inStr && !inML && i < fixed.length - 1 && fixed[i] === '/' && fixed[i+1] === '/') {
    while (i < fixed.length && fixed[i] !== '\n') i++;
  }
  else if (!inStr && !inML) {
    if (c === '{') depth++;
    else if (c === '}') depth--;
  }
}
console.log('Balance after fix:', depth, '(should be 0)');
if (depth !== 0) {
  console.log('ERROR: Still unbalanced!');
  process.exit(1);
}
writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', fixed);
console.log('Fixed index_src.js written');
