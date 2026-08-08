import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
const line797 = lines[796];
console.log('L797:', line797);
let h = '';
for (let i = 0; i < line797.length; i++) {
  h += line797.charCodeAt(i).toString(16).padStart(4,'0') + ' ';
  if (i > 60) { console.log('Rest of line (chars 61+):', JSON.stringify(line797.substring(61))); break; }
}
console.log('First 61 chars hex:', h.substring(0, 400));
// Show where the quotes are
let lastCode = '';
for (let i = 0; i < line797.length; i++) {
  const c = line797.charCodeAt(i);
  if (c === 0x27 || c === 0x22 || c > 127) {
    console.log('  Special at pos', i, ':', JSON.stringify(line797[i]), 'U+' + c.toString(16).toUpperCase());
  }
}
