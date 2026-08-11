import { readFileSync } from 'fs';
const files = {
  'live html': readFileSync('_live.html', 'utf8'),
  'src/html_src.js': readFileSync('src/html_src.js', 'utf8'),
  'dist/index.js': readFileSync('dist/index.js', 'utf8'),
};
const bad = ['馃', '煝', '敶', '涓', '鈭', '鉁', '馃敶', '馃煝', '馃煛'];
const good = ['🟢', '🟡', '🔴', '∞', '✔', '中'];
for (const [name, content] of Object.entries(files)) {
  const b = bad.filter(p => content.includes(p));
  const g = good.filter(p => content.includes(p));
  console.log(name, `len=${content.length}`);
  console.log('  GBK-corrupted patterns present:', b.length ? b.join(', ') : 'NONE');
  console.log('  proper chars present:', g.length ? g.join(', ') : 'NONE');
}
// Show the updateConnDot line in source
const src = files['src/html_src.js'];
const i = src.indexOf('updateConnDot(');
if (i >= 0) console.log('src updateConnDot line:', JSON.stringify(src.slice(i, i + 80)));
const j = src.indexOf('updateConnDot(');
const lines = src.split('\n').filter(l => l.includes('updateConnDot'));
console.log('src updateConnDot lines:', JSON.stringify(lines));
// zh loginTitle in src
const zhIdx = src.indexOf('loginTitle');
console.log('src around loginTitle:', JSON.stringify(src.slice(zhIdx - 10, zhIdx + 60)));
