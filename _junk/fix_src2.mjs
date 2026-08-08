import { readFileSync, writeFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
// Step 1: Remove trailing orphan }
// The file ends with "  });\n}\n\n}" - remove the last }
let fixed = s;
if (fixed.endsWith('}\n')) {
  fixed = fixed.substring(0, fixed.length - 1);
  console.log('Step 1: Removed trailing orphan }');
}
// Step 2: Remove Chinese-only comment lines (they may have { after // causing orphan braces)
// Only remove lines that are ENTIRELY comments with no code after //
const lines = fixed.split('\n');
const fixedLines = [];
let removedCount = 0;
for (const line of lines) {
  const t = line.trim();
  if (t.startsWith('//') && /[^\x00-\x7F]/.test(t)) {
    // Check if the comment contains only comment text or also code (like { after //)
    // Remove lines that are pure Chinese comments
    // Keep lines like: code; // 中文 (mixed)
    // Remove lines like: // 中文
    if (!t.includes('{') && !t.includes('}')) {
      // Pure Chinese comment line - remove
      removedCount++;
      fixedLines.push('___DELETED___');
    } else {
      // Has code characters - keep
      fixedLines.push(line);
    }
  } else {
    fixedLines.push(line);
  }
}
let clean = fixedLines.join('\n').replace(/^___DELETED___\n/gm, '');
console.log('Step 2: Removed', removedCount, 'Chinese comment lines');

// Verify
let depth = 0, inStr = false, inML = false;
for (let i = 0; i < clean.length; i++) {
  const c = clean[i];
  if (!inML && (c === '"' || c === "'")) inStr = !inStr;
  else if (!inStr && c === '`') inML = !inML;
  else if (inML && c === '\\') i++;
  else if (!inStr && !inML && i < clean.length-1 && clean[i] === '/' && clean[i+1] === '/') { while (i < clean.length && clean[i] !== '\n') i++; }
  else if (!inStr && !inML) { if (c==='{') depth++; else if (c==='}') depth--; }
}
console.log('Brace balance after fixes:', depth);

if (depth !== 0) {
  console.log('Still unbalanced! Dumping lines near end:');
  const clines = clean.split('\n');
  for (let i = clines.length - 10; i < clines.length; i++) {
    console.log('L' + (i+1) + ': ' + clines[i]);
  }
  process.exit(1);
}

writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', clean);
console.log('Fixed index_src.js written!');
