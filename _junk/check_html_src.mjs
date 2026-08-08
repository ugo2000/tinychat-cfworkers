import { readFileSync } from 'fs';
const s = readFileSync('src/html_src.js', 'utf8');
const zzh = (s.match(/String\.fromCharCode\(96\)/g) || []).length;
console.log('String.fromCharCode(96) count:', zzh);
const zzb = (s.match(/\x60/g) || []).length;
console.log('Total backticks:', zzb, '(pairs:', Math.floor(zzb/2), ')');
// Check theABOUT_HTML section
const aboutIdx = s.indexOf('const ABOUT_HTML = `');
if (aboutIdx >= 0) {
  const snippet = s.substring(aboutIdx, aboutIdx + 200);
  console.log('ABOUT_HTML start:', JSON.stringify(snippet.substring(0, 100)));
}
