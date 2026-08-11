const s = require('fs').readFileSync('dist/index.js', 'utf8');
const idx = s.indexOf('CHAT_ROUTE_OK');
if (idx >= 0) {
  const lineNum = s.slice(0, idx).split('\n').length;
  console.log('CHAT_ROUTE_OK found at line', lineNum);
  console.log(s.slice(idx, idx + 100));
} else {
  console.log('CHAT_ROUTE_OK NOT FOUND');
}
// Find /chat route
const ci = s.indexOf("path === '/chat'");
if (ci >= 0) {
  const lineNum = s.slice(0, ci).split('\n').length;
  console.log('\npath === /chat at line', lineNum);
  console.log(s.slice(ci, ci + 200));
}
