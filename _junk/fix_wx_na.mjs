import { readFileSync, writeFileSync } from 'fs';

// Clean wechat.js non-ASCII
let s = readFileSync('src/wechat_src.js', 'utf8');
let na = 0;
for (let i = 0; i < s.length; i++) {
  if (s.charCodeAt(i) > 127) na++;
}
console.log('wechat_src non-ASCII:', na);
const cleaned = s.replace(/[^\x00-\x7F]/g, '');
writeFileSync('src/wechat_src.js', cleaned);
console.log('Cleaned wechat_src, remaining non-ASCII:',
  [...cleaned].filter(c => c.charCodeAt(0) > 127).length);

// Also clean index_src
s = readFileSync('src/index_src.js', 'utf8');
na = 0;
for (let i = 0; i < s.length; i++) {
  if (s.charCodeAt(i) > 127) na++;
}
console.log('\nindex_src non-ASCII:', na);
const cleaned2 = s.replace(/[^\x00-\x7F]/g, '');
writeFileSync('src/index_src.js', cleaned2);
console.log('Cleaned index_src, remaining:', [...cleaned2].filter(c => c.charCodeAt(0) > 127).length);
