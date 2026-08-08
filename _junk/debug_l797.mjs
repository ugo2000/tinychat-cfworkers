import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
const lines = s.split('\n');
// Show raw hex of line 797
const line797 = lines[796];
console.log('Line 797 raw bytes:');
let hex = '';
for (let i = 0; i < line797.length; i++) {
  hex += line797.charCodeAt(i).toString(16).padStart(4, '0') + ' ';
}
console.log(hex);
// Check lines 794-799
for (let li = 793; li < 799; li++) {
  const line = lines[li];
  let h = '';
  for (let i = 0; i < line.length; i++) {
    h += line.charCodeAt(i).toString(16).padStart(4,'0') + ' ';
  }
  console.log('L' + (li+1) + ': ' + h.substring(0, 120));
}
