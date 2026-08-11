import { readFileSync } from 'fs';
const bundle = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');

// Find all unescaped double quotes in the ADMIN_HTML value
// Starting from const ADMIN_HTML = "
const constStart = bundle.indexOf('const ADMIN_HTML = ');
const jsonStart = constStart + 'const ADMIN_HTML = '.length; // opening "
const jsonEnd = 44453 + 1; // closing "

let i = jsonStart + 1;
let escaped = false;
let count = 0;
let positions = [];

while (i < jsonEnd) {
  const ch = bundle[i];
  if (escaped) { escaped = false; i++; continue; }
  if (ch === '\\') { escaped = true; i++; continue; }
  if (ch === '"') {
    count++;
    positions.push(i);
    i++;
  } else {
    i++;
  }
}

console.log('Total unescaped " in ADMIN_HTML value:', count);
console.log('Positions of unescaped ":', positions.slice(0, 20));

// Find the last few before the end
const lastFew = positions.slice(-5);
lastFew.forEach(p => {
  console.log('At', p, ':', JSON.stringify(bundle.substring(Math.max(0, p-20), p+20)));
});
