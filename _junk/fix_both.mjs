import { readFileSync, writeFileSync } from 'fs';

// Fix 1: Remove duplicate case in index.js
let idx = readFileSync('src/index.js', 'utf8');
const idxLines = idx.split('\n');
// Find and remove the duplicate /api/pay-confirm case (keep first, remove second)
let removed = false;
const idxFixed = idxLines.filter(l => {
  if (!removed && l.includes("case '/api/pay-confirm':")) {
    // Check if next non-empty line is also /api/pay-confirm
    removed = true;
    return false;
  }
  return true;
});
console.log('index.js: removed', idxLines.length - idxFixed.length, 'duplicate lines');
writeFileSync('src/index.js', idxFixed.join('\n'), 'utf8');

// Fix 2: Replace </script> in html.js template literals with </scr"+"ipt>
// This prevents esbuild from mis-parsing it as closing the script tag
let html = readFileSync('src/html.js', 'utf8');
// Only replace in template literal context (after backtick, before backtick)
// Use a split: '</scr"+"ipt>' in appropriate places
// The pattern: `...\n</script>\n...` in template literals
// Replace standalone </script> lines with </scr"+"ipt>
const htmlFixed = html.replace(/\n<\/script>\n/g, '\n<\/scr"+"ipt>\n');
if (htmlFixed !== html) {
  console.log('html.js: replaced </script> with </scr"+"ipt> in template literals');
} else {
  console.log('html.js: no </script> replacements needed');
}
writeFileSync('src/html.js', htmlFixed, 'utf8');
console.log('done');
