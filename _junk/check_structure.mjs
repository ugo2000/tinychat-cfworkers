import { readFileSync } from 'fs';
const html = readFileSync('src/html.js', 'utf8');
const lines = html.split('\n');
console.log('Total lines:', lines.length);

// Find all template defs and exports
const results = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l.match(/^const [A-Z_]+ = `$/) || l.match(/^export \{ [^}]+ \}$/) || l.match(/^export default [A-Z]+;?$/)) {
    results.push(`L${i+1}: ${lines[i].substring(0,80)}`);
  }
}
results.forEach(r => console.log(r));

// Check for the specific issue: lines ending with backtick followed by export
let issues = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l === '`' || l === '`;') {
    const next = lines[i+1]?.trim() || '';
    if (next.startsWith('export ') || next.startsWith('const ')) {
      issues.push(`L${i+1}: ${l} -> ${next}`);
    }
  }
}
console.log('\nPotential issues:');
issues.forEach(i => console.log(i));
