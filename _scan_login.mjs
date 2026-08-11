const s = require('fs').readFileSync('src/html_src.js', 'utf8');
const i = s.indexOf('id="loginForm"');
console.log(s.slice(i, i + 800));
