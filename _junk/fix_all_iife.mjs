import { readFileSync, writeFileSync } from 'fs';
let html = readFileSync('src/html.js', 'utf8');
const lines = html.split('\n');

// Fix all IIFE closings missing };
// Case 1: `}` followed by `</script>` (TEST_HTML: run() function end)
// Case 2: `})();` followed by `</script>` (ABOUT_HTML, PRICING_HTML: self-invoking IIFE end)

const fixed = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const next = lines[i+1] || '';
  const next2 = lines[i+2] || '';
  
  fixed.push(l);
  
  // Case 1: `}` + `</script>` (TEST_HTML run() end)
  if (l.trim() === '}' && next.trim() === '</script>' && next2.trim() !== '};') {
    fixed.push('};');
    console.log(`Added }; after line ${i+1} (run() end)`);
    i++; // skip the next line we consumed
  }
  // Case 2: `})();` + `</script>` (ABOUT/PRICING IIFE end)
  else if (l.trim() === '})();' && next.trim() === '</script>' && next2.trim() !== '};') {
    fixed.push('};');
    console.log(`Added }; after line ${i+1} (IIFE end)`);
    i++;
  }
}

writeFileSync('src/html.js', fixed.join('\n'), 'utf8');

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
if (issues === 0) console.log('All fixed! No more backtick-to-export issues.');
console.log('Total lines:', lines2.length);
