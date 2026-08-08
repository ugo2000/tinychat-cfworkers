import { readFileSync } from 'fs';
const s = readFileSync('src/html_src.js', 'utf8');
const re = /export\s+const\s+HTML\s*=\s*\x60/;
console.log('Match HTML:', re.test(s));
const m = s.match(re);
if (m) console.log('Match at:', m.index);
// Show first 200 chars
console.log('First 200 chars:', JSON.stringify(s.substring(0, 200)));
// Check around "ABOUT_HTML"
const aboutIdx = s.indexOf('ABOUT_HTML');
if (aboutIdx >= 0) {
  console.log('ABOUT_HTML context:', JSON.stringify(s.substring(aboutIdx, aboutIdx + 60)));
}
