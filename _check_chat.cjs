const s = require('fs').readFileSync('dist/index.js', 'utf8');
console.log('Total len:', s.length);
const i = s.indexOf("path === '/chat'");
console.log('/chat found at:', i);
if (i >= 0) console.log(s.slice(i - 20, i + 200));
else {
  // Search for path matching pattern
  const lines = s.split('\n');
  lines.forEach((l, n) => { if (l.includes('/chat') && !l.includes('location.host')) console.log('Line', n + 1, ':', l.slice(0, 120)); });
}
