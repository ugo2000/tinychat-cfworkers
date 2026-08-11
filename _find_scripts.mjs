import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const content = readFileSync(base + 'src/html_src.js', 'utf8');
const lines = content.split('\n');

// Find all <script> and </script> occurrences with line numbers
const scripts = [];
let pos = 0;
while (pos < content.length) {
  const s = content.indexOf('<script>', pos);
  const e = content.indexOf('</script>', pos);
  if (s < 0 && e < 0) break;
  
  const next = (s < 0) ? e : (e < 0) ? s : Math.min(s, e);
  const isStart = (s >= 0 && s === next);
  
  const lineInfo = content.substring(0, next).split('\n');
  const lineNum = lineInfo.length;
  
  if (isStart) {
    scripts.push({ type: 'open', pos: s, line: lineNum });
  } else {
    scripts.push({ type: 'close', pos: e, line: lineNum });
  }
  pos = next + (isStart ? 8 : 9);
}

console.log('All <script>/</script> tags:');
scripts.forEach(s => console.log(' ', s.type.toUpperCase(), 'at pos', s.pos, 'line', s.line, ':', JSON.stringify(content.substring(s.pos, s.pos + 20))));

// Now check admin section specifically
const adminStart = content.indexOf('ADMIN_HTML');
const pricingStart = content.indexOf('PRICING_HTML');
const adminSection = content.substring(adminStart, pricingStart);
const adminScripts = [];
pos = 0;
while (pos < adminSection.length) {
  const s = adminSection.indexOf('<script>', pos);
  const e = adminSection.indexOf('</script>', pos);
  if (s < 0 && e < 0) break;
  const next = (s < 0) ? e : (e < 0) ? s : Math.min(s, e);
  const isStart = (s >= 0 && s === next);
  adminScripts.push({ type: isStart ? 'OPEN' : 'CLOSE', offset: next, abs: adminStart + next });
  pos = next + (isStart ? 8 : 9);
}
console.log('\nADMIN_HTML section script tags:');
adminScripts.forEach(s => {
  const lineInfo = content.substring(0, s.abs).split('\n');
  console.log(' ', s.type, 'at admin offset', s.offset, 'line', lineInfo.length);
});
