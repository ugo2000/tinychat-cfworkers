import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
console.log('Size:', s.length);
// Search for all script-related patterns
const terms = ['scr"', 'ipt>', 'script', '</body', '</html', '</scr'];
for (const term of terms) {
  let idx = s.indexOf(term);
  let count = 0;
  while (idx >= 0) { count++; idx = s.indexOf(term, idx + 1); }
  if (count) console.log(term, 'found', count, 'times');
}
// Show the area where script close should be (after ADMIN_HTML)
const adminIdx = s.indexOf('export default HTML');
console.log('\nexport default HTML at:', adminIdx);
if (adminIdx > 0) {
  const chunk = s.substring(adminIdx - 50, adminIdx + 50);
  console.log('Context:', JSON.stringify(chunk));
}
