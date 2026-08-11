import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const content = readFileSync(base + 'src/html_src.js', 'utf8');

// Find ALL </script> occurrences
let pos = 0;
const closes = [];
while ((pos = content.indexOf('</script>', pos)) >= 0) {
  const lines = content.substring(0, pos).split('\n');
  closes.push({ pos, line: lines.length, ctx: content.substring(pos - 30, pos + 40) });
  pos += 9;
}
console.log('All </script> occurrences:', closes.length);
closes.forEach(c => console.log('  line', c.line, 'pos', c.pos, ':', JSON.stringify(c.ctx)));

// Now check for TEST_HTML specifically
const testStart = content.indexOf('TEST_HTML');
if (testStart >= 0) {
  const next = closes.find(c => c.pos > testStart);
  console.log('\nTEST_HTML starts at line', content.substring(0, testStart).split('\n').length);
  if (next) console.log('First </script> after TEST_HTML: line', next.line);
}

// Check what template the script at line 848 belongs to
const line698 = content.split('\n').slice(0, 697).join('\n').length;
const line848 = content.split('\n').slice(0, 847).join('\n').length;
console.log('\nChar pos of line 698:', line698);
console.log('Char pos of line 848:', line848);

// Find template starts
const templates = ['HTML', 'ADMIN_HTML', 'TEST_HTML', 'ABOUT_HTML', 'PRICING_HTML'];
for (const t of templates) {
  const idx = content.indexOf(t);
  if (idx >= 0) {
    const line = content.substring(0, idx).split('\n').length;
    console.log(t, 'starts at line', line);
  }
}
