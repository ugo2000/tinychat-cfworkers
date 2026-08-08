import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
// Search for script-related patterns
const searches = ['</scr', 'script>', 'ADMIN_HTML', 'PRICING_HTML', 'TEST_HTML', 'ABOUT_HTML'];
for (const term of searches) {
  const idx = s.indexOf(term);
  console.log(term, 'at:', idx, idx >= 0 ? 'YES' : 'NO');
  if (idx >= 0) console.log('  context:', JSON.stringify(s.substring(idx, idx + 40)));
}
// Check file is not empty or broken
console.log('\nSize:', s.length);
console.log('First 100 chars:', JSON.stringify(s.substring(0, 100)));
