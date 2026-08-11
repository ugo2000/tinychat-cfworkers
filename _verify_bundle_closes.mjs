import { readFileSync } from 'fs';
const b = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');
console.log('bundle size:', b.length);

// Find each const declaration and its JSON string
const names = ['ADMIN_HTML', 'TEST_HTML', 'ABOUT_HTML', 'PRICING_HTML'];
const mainIdx = b.indexOf('const HTML = ');
console.log('const HTML at:', mainIdx);

let all = [];
const re = /const (HTML|ADMIN_HTML|TEST_HTML|ABOUT_HTML|PRICING_HTML) = "([^"]*)"\n?;/g;
let m;
while ((m = re.exec(b)) !== null) {
  all.push({ name: m[1], len: m[2].length, tail: m[2].substring(m[2].length - 40) });
}
console.log('\n=== JSON string constants in bundle ===');
all.forEach(x => console.log(x.name + ': len=' + x.len + ' tail=' + JSON.stringify(x.tail)));

// Simulate browser parse for each: count real </script>
console.log('\n=== script tag sanity per template ===');
for (const x of all) {
  const opens = (x.tail.match(/<script>/g) || []).length;
  const closes = (x.tail.match(/<\/script>/g) || []).length;
  console.log(x.name + ': script opens=' + opens + ' closes=' + closes + ' (tail only)');
}

// Full page check: every page should have exactly one <script> and one </script>
console.log('\n=== full template scan ===');
let idx = 0;
const fulls = [];
while (idx < b.length) {
  const s = b.indexOf('<script>', idx);
  if (s === -1) break;
  const e = b.indexOf('</script>', s);
  if (e === -1) { console.log('ORPHAN <script> at ' + s + ' - NO CLOSE!'); break; }
  fulls.push({ open: s, close: e, len: e - s });
  idx = e + 9;
}
fulls.forEach(f => console.log('script block @' + f.open + ' len=' + f.len));
console.log('total script blocks:', fulls.length);
