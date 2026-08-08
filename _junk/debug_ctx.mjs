import { readFileSync } from 'fs';
const s = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/index_src.js', 'utf8');
// Show context around position 6410
console.log('Chars 6400-6425:');
for (let i = 6400; i < 6425; i++) {
  const c = s[i];
  console.log(i + ': ' + c + ' (code ' + c.charCodeAt(0) + ')');
}
console.log('\nContext around 6410:');
console.log(JSON.stringify(s.substring(6380, 6440)));
// Find the HTML template boundary
const h1 = s.indexOf('const HTML = `');
const h2 = s.indexOf('export { HTML');
console.log('\nconst HTML = ` at:', h1);
console.log('export { HTML at:', h2);
// If there's an HTML template, show its start and end
if (h1 >= 0 && h2 >= 0) {
  console.log('First template region:', h1, '-', h2);
  console.log('Content:', JSON.stringify(s.substring(h1, h1+200)));
}
