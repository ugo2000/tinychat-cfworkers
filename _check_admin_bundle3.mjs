import { readFileSync } from 'fs';
const bundle = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');

// Find the end of the ADMIN_HTML JSON string - look for </html>" sequence
const htmlClose = bundle.indexOf('</html>');
console.log('</html> at:', htmlClose);
console.log('Chars after </html>:', JSON.stringify(bundle.substring(htmlClose + 7, htmlClose + 14)));

// The closing quote should be right after </html>
const closingQuote = htmlClose + 6;
console.log('Pos of closing quote:', closingQuote, 'char:', JSON.stringify(bundle[closingQuote]));

// Now extract properly: the JSON starts after the = 
const constStart = bundle.indexOf('const ADMIN_HTML = ');
const jsonStart = constStart + 'const ADMIN_HTML = '.length;
console.log('\nconst ADMIN_HTML at:', constStart);
console.log('JSON starts at:', jsonStart, 'char:', JSON.stringify(bundle[jsonStart]));

// Extract the full JSON string including closing quote
const closingQ = htmlClose + 6;
if (bundle[closingQ] === '"') {
  const jsonStr = bundle.substring(jsonStart, closingQ + 1);
  console.log('Extracted JSON len:', jsonStr.length);
  try {
    const html = JSON.parse(jsonStr);
    console.log('✅ Parsed HTML len:', html.length);
    const s = html.indexOf('<script>');
    const e = html.indexOf("</scr'+'ipt>");
    if (s >= 0 && e >= 0) {
      const script = html.substring(s + 8, e);
      console.log('Script len:', script.length, 'lines:', script.split('\n').length);
      try {
        new Function(script);
        console.log('✅ new Function OK');
      } catch(err) {
        console.log('❌', err.message);
      }
    }
  } catch(e) {
    console.log('Parse error:', e.message);
  }
} else {
  console.log('NO closing quote at expected position, found:', JSON.stringify(bundle[closingQ]));
}
