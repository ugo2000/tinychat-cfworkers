const s = require('fs').readFileSync('dist/index.js', 'utf8');
const lines = s.split('\n');
// Find the DO class (ChatRoom) and its fetch
const doClassIdx = s.indexOf('export class ChatRoom');
console.log('ChatRoom class at char:', doClassIdx, 'line:', s.slice(0, doClassIdx).split('\n').length);
// Find ChatRoom fetch
const doFetchIdx = s.indexOf('async fetch(request', doClassIdx);
console.log('DO fetch at char:', doFetchIdx, 'line:', s.slice(0, doFetchIdx).split('\n').length);
// Check lines 310-360 (around line 344)
console.log('\n=== Lines 305-365 ===');
for (let n = 304; n < 365; n++) {
  const l = lines[n];
  const marker = (n === 343) ? ' <<<<<' : '';
  console.log(String(n + 1).padStart(4), '|', l.slice(0, 120) + marker);
}
