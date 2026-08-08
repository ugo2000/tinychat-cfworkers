import { readFileSync } from 'fs';
const htmlSrc = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');

function extractTemplateSmart(src, name) {
  const marker = 'const ' + name + ' = ';
  const start = src.indexOf(marker + '`');
  if (start < 0) return '';
  const cs = start + marker.length + 1;
  let i = cs;
  while (i < src.length) {
    if (src[i] === '\\' && i + 1 < src.length && '`$'.includes(src[i+1])) { i += 2; }
    else if (src[i] === '\\' && i + 1 < src.length && src[i+1] === '\\') { i += 2; }
    else if (src[i] === '`') { return src.substring(cs, i); }
    else { i++; }
  }
  return src.substring(cs);
}

const pricing = extractTemplateSmart(htmlSrc, 'PRICING_HTML');
console.log('PRICING_HTML length:', pricing.length);
console.log('Has </html>:', pricing.includes('</html>'));
console.log('\nLast 100 chars:');
console.log(JSON.stringify(pricing.slice(-100)));

// Now apply escapeContent
function escapeContent(s) {
  s = s.replace(/\\/g, '\\\\');
  s = s.replace(/`/g, '\\`');
  s = s.replace(/\$\{/g, '\\${');
  return s;
}
const esc = escapeContent(pricing);
console.log('\nAfter escape, last 100 chars:');
console.log(JSON.stringify(esc.slice(-100)));

// Now build a test HTML block
const block = `const PRICING_HTML = \`${esc}\`;`;
console.log('\nLast 100 chars of block:');
console.log(JSON.stringify(block.slice(-100)));

// Find where `export default` would be
const expIdx = block.indexOf('export default');
console.log('\n"export default" index in block:', expIdx);
if (expIdx > 0) {
  console.log('Chars before it:', JSON.stringify(block.slice(expIdx - 30, expIdx + 20)));
}
