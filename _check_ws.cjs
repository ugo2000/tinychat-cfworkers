const s = require('fs').readFileSync('src/index_src.js', 'utf8');
// Show the full export default fetch function
const i = s.indexOf("export default");
console.log(s.slice(i, i + 3000));
