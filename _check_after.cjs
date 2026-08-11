const s = require('fs').readFileSync('dist/index.js', 'utf8');
const i = s.indexOf("path === '/chat'");
console.log('=== /chat block ===');
console.log(s.slice(i, i + 300));
console.log('\n=== AFTER /chat ===');
const after = s.indexOf("path === '/chat'");
console.log(s.slice(after + 300, after + 600));
