import { readFileSync } from 'fs';
const script = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/_admin_live_v2.js', 'utf8');
const lines = script.split('\n');

// Show lines 100-126 (approvePay area)
console.log('=== Lines 100-126 ===');
for (let i = 99; i < lines.length; i++) {
  console.log((i+1) + ': ' + lines[i]);
}

// Also check balance of braces
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Count { and } ignoring strings
  let inStr = false, inTpl = false, escaped = false;
  for (const ch of line) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (inTpl) {
      if (ch === '`') inTpl = false;
      continue;
    }
    if (inStr) {
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '`') { inTpl = true; continue; }
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  console.log('Line', (i+1), 'depth:', depth, ':', lines[i].substring(0, 80));
}
