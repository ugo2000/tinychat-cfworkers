const s = require('fs').readFileSync('dist/index.js', 'utf8');
const lines = s.split('\n');
// Find lines around /chat in dist (line 178) - check lines 175-195
console.log('=== Lines 175-195 ===');
for (let n = 174; n < 195; n++) {
  console.log(String(n + 1).padStart(4), '|', lines[n]);
}
// Also find the default 404
const line404 = lines.findIndex((l, n) => l.includes("return new Response('Not Found'"));
console.log('\n=== Default 404 at line', line404 + 1, '===');
console.log(lines.slice(Math.max(0, line404 - 5), line404 + 2).join('\n'));
// Find the fetch function closing brace
const exportIdx = s.indexOf('export default');
const closing = s.lastIndexOf('};', s.length - 100);
console.log('\n=== export default ends near:', closing, '===');
console.log(s.slice(closing - 50, closing + 50));
