import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
// Show line 797 (index 796) raw bytes near the problematic area
const line797 = lines[796];
console.log('L797:', line797);
// Find all non-ASCII chars in line 797
for (let i = 0; i < line797.length; i++) {
  const c = line797.charCodeAt(i);
  if (c > 127) {
    console.log('  Non-ASCII at pos', i, ': char', JSON.stringify(line797[i]), 'U+' + c.toString(16).toUpperCase().padStart(4, '0'));
  }
}
// Also check if there's a similar issue on nearby lines
for (let li = 793; li < 799; li++) {
  const line = lines[li];
  for (let i = 0; i < line.length; i++) {
    const c = line.charCodeAt(i);
    if (c > 127) {
      console.log('L' + (li+1) + ' non-ASCII at pos', i, ':', JSON.stringify(line[i]), 'U+' + c.toString(16).toUpperCase());
    }
  }
}
