import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
const line797 = lines[796];
console.log('L797:', line797);
for (let i = 0; i < line797.length; i++) {
  const c = line797.charCodeAt(i);
  if (c > 127) {
    console.log('  Non-ASCII at pos', i, ': char', JSON.stringify(line797[i]), 'U+' + c.toString(16).toUpperCase().padStart(4, '0'));
  }
}
// Find all non-ASCII in entire file
const nonAsciiLines = [];
for (let li = 0; li < lines.length; li++) {
  for (let i = 0; i < lines[li].length; i++) {
    const c = lines[li].charCodeAt(i);
    if (c > 127) {
      nonAsciiLines.push('L' + (li+1) + ' pos=' + i + ': ' + JSON.stringify(lines[li][i]) + ' U+' + c.toString(16).toUpperCase());
    }
  }
}
console.log('\nAll non-ASCII:', nonAsciiLines.length);
nonAsciiLines.slice(0, 30).forEach(x => console.log(x));
