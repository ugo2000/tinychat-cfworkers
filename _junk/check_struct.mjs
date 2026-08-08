import { readFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
const lines = s.split('\n');

// Show all export declarations and their closing lines
const exportLines = lines.map((l, i) => ({ line: i + 1, text: l.trim() }))
  .filter(({ line, text }) => text.startsWith('export const ') || text.startsWith('const ') && text.includes('= `') || text.includes('</html>'));

exportLines.forEach(({ line, text }) => {
  console.log(`L${line}: ${text.substring(0, 80)}`);
});

console.log('\n--- Check what comes after </html>; ---');
// Find </html>; lines
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('</html>')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
    console.log(`Line ${i+2}: ${lines[i+1] ? lines[i+1].trim() : 'EOF'}`);
    console.log(`Line ${i+3}: ${lines[i+2] ? lines[i+2].trim() : 'EOF'}`);
  }
}
