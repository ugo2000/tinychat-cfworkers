const s = require('fs').readFileSync('dist/index.js', 'utf8');
const i = s.indexOf("path === '/chat'");
console.log(s.slice(Math.max(0, i - 300), i + 50));
