import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
console.log('Size:', s.length);

// Look for key strings from html.js that should be in the bundle
const terms = ['function doLogin', 'connectWS', 'ADMIN_HTML', 'doBuy', 'quotaBadge', 'wechat', 'PRICING_HTML', 'ABOUT_HTML', 'random'];
for (const term of terms) {
  const idx = s.indexOf(term);
  console.log(term, 'found at:', idx);
}

// Look for the concatenation replacement
const concatIdx = s.indexOf('scr" + "ipt');
console.log('\nConcatenation at:', concatIdx);

// Check if there are multiple exports
const exports = s.match(/export/g);
console.log('\nexport count:', exports?.length || 0);
const imports = s.match(/^import /gm);
console.log('import count:', imports?.length || 0);
console.log('First 200 chars:', JSON.stringify(s.substring(0, 200)));
