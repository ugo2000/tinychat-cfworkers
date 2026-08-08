import { readFileSync, writeFileSync } from 'fs';
let html = readFileSync('src/html.js', 'utf8');
const lines = html.split('\n');

// Find the specific lines to fix
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  // Check if line is the IIFE closing `});` that needs `};`
  // Pattern: (function(){...})();
  if (l === "});" && i + 1 < lines.length) {
    const next = lines[i+1].trim();
    if (next === '</script>') {
      console.log(`L${i+1}: IIFE closing found, next is </script> - adding };`);
      lines[i] = '});';
      // Insert a new line with };
      lines.splice(i+1, 0, '};');
      i++; // skip the inserted line
    }
  }
}

writeFileSync('src/html.js', lines.join('\n'), 'utf8');

// Verify
const html2 = readFileSync('src/html.js', 'utf8');
const lines2 = html2.split('\n');
let issues = 0;
for (let i = 0; i < lines2.length; i++) {
  const l = lines2[i].trim();
  if (l === '`' || l === '`;') {
    const next = lines2[i+1]?.trim() || '';
    if (next.startsWith('export ') || next.startsWith('const ')) {
      console.log(`Still broken at L${i+1}: ${l} -> ${next}`);
      issues++;
    }
  }
}
if (issues === 0) console.log('All fixed - no more backtick-to-export issues');
console.log('done, total lines:', lines2.length);
