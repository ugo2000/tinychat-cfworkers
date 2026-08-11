import { readFileSync } from 'fs';
const src = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');

// 1. Check doLogout
const dl = src.indexOf('function doLogout');
console.log('=== doLogout ===');
console.log(src.substring(dl, dl + 500));

// 2. Check sendMsg guard
const sm = src.indexOf('const inp = document.getElementById');
console.log('\n=== sendMsg guard ===');
console.log(src.substring(sm - 100, sm + 200));

// 3. Verify no other bare single-quote-in-single-quote issues in HTML template scripts
// Find all onclick attributes inside the HTML template (lines with onclick=)
const lines = src.split('\n');
console.log('\n=== all onclick occurrences ===');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onclick=')) {
    console.log('L' + (i+1) + ': ' + lines[i].substring(0, 250));
  }
}
