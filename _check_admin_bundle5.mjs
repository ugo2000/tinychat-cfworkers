import { readFileSync } from 'fs';
const bundle = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');

// ADMIN_HTML ends at </html>" at pos 31555, so the closing " is at 31561
// ADMIN_HTML value starts after "const ADMIN_HTML = " which is at 31565
// So JSON string: opening " at 31565 + 18 = 31583, closing " at 31561
const openingQuote = 31565 + 'const ADMIN_HTML = '.length; // = 31583
const closingQuote = 31555 + 6; // = 31561 (after </html>)
console.log('Opening quote at:', openingQuote, 'char:', JSON.stringify(bundle[openingQuote]));
console.log('Closing quote at:', closingQuote, 'char:', JSON.stringify(bundle[closingQuote]));

// Extract JSON (from opening quote to closing quote inclusive)
const jsonStr = bundle.substring(openingQuote, closingQuote + 1);
console.log('\nJSON string len:', jsonStr.length);
console.log('JSON start:', JSON.stringify(jsonStr.substring(0, 30)));
console.log('JSON end:', JSON.stringify(jsonStr.substring(jsonStr.length - 30)));

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
      console.log('✅ new Function OK - bundle is clean!');
    } catch(err) {
      console.log('❌ new Function error:', err.message);
    }
  }
} catch(e) {
  console.log('Parse error:', e.message);
}
