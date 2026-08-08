import { readFileSync } from 'fs';
const htmlSrc = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');

const marker = 'const ABOUT_HTML = ';
const start = htmlSrc.indexOf(marker + '`');
const cs = start + marker.length + 1;
let depth = 1, i = cs;
while (i < htmlSrc.length && depth > 0) {
  if (htmlSrc[i] === '`') depth--;
  i++;
}
const raw = htmlSrc.substring(cs, i - 1);

function esc(s) {
  s = s.replace(/\\/g, '\\\\');
  s = s.replace(/`/g, '\\`');
  s = s.replace(/\$\{/g, '\\${');
  return s;
}
const escd = esc(raw);

console.log('Raw </script>:', (raw.match(/<\/script>/gi)||[]).length);
console.log('Escaped </script>:', (escd.match(/<\/script>/gi)||[]).length);
console.log('Escaped has literal backslash:', escd.includes('\\\\'));

const SCR = '<\\/script>';
const parts = escd.split(SCR);
console.log('Split parts:', parts.length);

const bundle = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');
console.log('\nBundle size:', bundle.length);
console.log('Bundle </script>:', (bundle.match(/<\/script>/gi)||[]).length);
console.log('Bundle has backtick-open script:', bundle.includes('\x60 + \x60'));
console.log('Bundle has + head:', bundle.includes('+ head'));

// Check around ABOUT_HTML in bundle
const aboutPos = bundle.indexOf('const ABOUT_HTML');
if (aboutPos >= 0) {
  console.log('\nABOUT_HTML at char', aboutPos, '(L' + (bundle.substring(0, aboutPos).split('\n').length) + ')');
  console.log('Context:', bundle.substring(aboutPos, aboutPos + 200));
}
