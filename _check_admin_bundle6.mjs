import { readFileSync } from 'fs';
const bundle = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');

// Find all </html>" which are the JSON closing boundaries
const closes = [];
let pos = 0;
while ((pos = bundle.indexOf('</html>"', pos)) >= 0) {
  closes.push(pos);
  pos += 7;
}
console.log('All closes:', closes);

// const ADMIN_HTML = at 31565, const TEST_HTML = at 44457
// So ADMIN_HTML JSON value is between 31565+'const ADMIN_HTML = ' and the </html>" at 44447
// Opening quote = 31565 + 18 = 31583
// Closing quote = 44447 + 6 = 44453
const jsonStr = bundle.substring(31583, 44454);
console.log('\nADMIN_HTML JSON len:', jsonStr.length);
console.log('Start:', JSON.stringify(jsonStr.substring(0, 30)));
console.log('End:', JSON.stringify(jsonStr.substring(jsonStr.length - 30)));

try {
  const html = JSON.parse(jsonStr);
  console.log('✅ Parsed HTML len:', html.length);
  const s = html.indexOf('<script>');
  const e = html.indexOf("</scr'+'ipt>");
  if (s >= 0 && e >= 0) {
    const script = html.substring(s + 8, e);
    console.log('Script len:', script.length, 'lines:', script.split('\n').length);
    console.log('Has async function approvePay:', script.includes('async function approvePay'));
    try {
      new Function(script);
      console.log('✅ new Function OK - bundle admin script is CLEAN!');
    } catch(err) {
      console.log('❌ new Function error:', err.message);
    }
  } else {
    console.log('Script not found - s:', s, 'e:', e);
  }
} catch(e) {
  console.log('Parse error:', e.message);
}
