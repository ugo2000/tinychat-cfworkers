const s = require('fs').readFileSync('dist/index.js', 'utf8');
// Find the DO fetch handler - it should have its own routes
const lines = s.split('\n');
// Find DO fetch function
const doFetchIdx = s.indexOf('DO fetch', s.indexOf('export class ChatRoom'));
console.log('DO fetch found at char index:', doFetchIdx);
// Find all path checks INSIDE the DO (after DO fetch starts)
const doSection = s.slice(doFetchIdx);
const doLines = doSection.split('\n');
doLines.forEach((l, n) => {
  if (l.match(/path\s*===?\s*['"]/)) {
    console.log('DO line', n + 1, ':', l.trim().slice(0, 100));
  }
});
// Also check what the default return in DO fetch is
const doFetchStart = s.indexOf('async fetch(request', s.indexOf('export class ChatRoom'));
const afterDoFetch = s.slice(doFetchStart + 50);
const nextReturn = afterDoFetch.match(/return [^;]{0,100}/);
console.log('\nFirst return in DO fetch:', nextReturn ? nextReturn[0] : 'not found');
// Check DO fetch function lines
console.log('\nDO fetch lines around path check:');
const chatInDo = doSection.indexOf("path === '/chat'");
if (chatInDo >= 0) {
  const relPos = doSection.length - chatInDo;
  console.log('/chat found in DO section at offset', chatInDo);
  console.log(doSection.slice(Math.max(0, chatInDo - 100), chatInDo + 200));
} else {
  console.log('/chat NOT found in DO section');
  // Check what's around the DO fetch path checks
  doLines.slice(0, 80).forEach((l, n) => {
    if (l.match(/path\s*===?\s*['"]/) || l.includes('if') || l.includes('return')) {
      console.log('DO line', n + 1, ':', l.trim().slice(0, 100));
    }
  });
}
