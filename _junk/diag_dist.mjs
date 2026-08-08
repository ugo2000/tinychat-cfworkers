import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
const lines = s.split('\n');

// Count backticks
const opens = (s.match(/\`/g) || []).length;
console.log('Total backticks:', opens, '(pairs:', Math.floor(opens/2), ')');

// Find export lines
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export')) {
    console.log('L' + (i+1) + ': ' + lines[i].trim().substring(0, 80));
  }
}

// Find first </html>
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('</html>')) {
    console.log('First </html> at L' + (i+1));
    break;
  }
}

// Find first </script>
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('</script>')) {
    console.log('First </script> at L' + (i+1));
    break;
  }
}

// Check around line 1074
console.log('--- Around line 1074 ---');
for (let i = 1070; i <= 1080; i++) {
  if (lines[i]) {
    console.log('L' + (i+1) + ': ' + lines[i]);
  }
}

// Count const ZH=
const zhCount = (s.match(/const ZH=/g) || []).length;
console.log('const ZH= count:', zhCount);
