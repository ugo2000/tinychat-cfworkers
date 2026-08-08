import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
// Look for the concatenation pattern
const patterns = ['scr" + "ipt>', 'scr\\" + \\"ipt>', 'scr"+"ipt>', 'scr\\"" + "\\"ipt>'];
for (const p of patterns) {
  console.log('Pattern', JSON.stringify(p), 'found:', s.includes(p));
}
// Show what's around where </script> should be
const idx = s.indexOf('ADMIN_HTML');
console.log('ADMIN_HTML at:', idx);
// Find the first occurrence of something like scr followed by ipt
const scrIdx = s.indexOf('scr');
console.log('First scr at:', scrIdx, s.substring(scrIdx - 2, scrIdx + 30));
