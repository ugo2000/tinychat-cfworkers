import { readFileSync } from 'fs';
const content = readFileSync('src/html.js', 'utf8');
const lines = content.split('\n');
console.log('Lines:', lines.length);
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l.match(/^const [A-Z_]+ = `$/) || l.match(/^export default HTML;$/) || l.match(/^export \{ [^}]+ \}$/)) {
    console.log('L' + (i+1) + ': ' + l.substring(0, 50));
  }
}
let count = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'export default HTML;') count++;
}
console.log('export default count:', count);
console.log('done');
