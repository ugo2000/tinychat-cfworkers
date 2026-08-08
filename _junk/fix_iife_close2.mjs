import { readFileSync, writeFileSync } from 'fs';
let html = readFileSync('src/html.js', 'utf8');
const lines = html.split('\n');

// Fix TEST_HTML: after line 1665 (run function closing `}`) insert `};`
// The pattern: the line before </script> for each template
// Find lines where next line is </script> and add };
const fixed = [];
for (let i = 0; i < lines.length; i++) {
  fixed.push(lines[i]);
  if (lines[i].trim() === '}' && lines[i+1]?.trim() === '</script>') {
    // Check it's not already followed by };
    if (lines[i+2]?.trim() !== '};') {
      fixed.push('};');
    }
  }
}

writeFileSync('src/html.js', fixed.join('\n'), 'utf8');
console.log('done, lines:', fixed.length);
