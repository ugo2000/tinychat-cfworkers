const s = require('fs').readFileSync('dist/index.js', 'utf8');
const lines = s.split('\n');
// Find all path === lines
lines.forEach((l, n) => {
  if (l.match(/path\s*===?\s*['"]\//)) {
    console.log('Line', n + 1, ':', l.trim().slice(0, 100));
  }
});
