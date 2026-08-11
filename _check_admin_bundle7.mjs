import { readFileSync } from 'fs';
const bundle = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');

// Let's use a proper approach: find all occurrences of ";const ADMIN_HTML = "
// and the ";const TEST_HTML = " to determine boundaries
const adminStart = bundle.indexOf('";const ADMIN_HTML = "');
const testStart = bundle.indexOf('";const TEST_HTML = "');
console.log('";const ADMIN_HTML = " at:', adminStart);
console.log('";const TEST_HTML = " at:', testStart);

// So the closing " of ADMIN_HTML is just before the first pattern
const closingQuote = adminStart;
const openingQuote = adminStart - 1 - 12870; // work backwards: char before " at closingQuote is the last char of value
console.log('Closing quote at:', closingQuote);
console.log('Opening quote at:', openingQuote, 'char:', JSON.stringify(bundle[openingQuote]));

// Actually let me just find the opening quote by scanning backwards from the closing
// The value should be ~12870 chars long
const valueLen = closingQuote - (openingQuote + 1);
console.log('Value length:', valueLen);

// Let's verify the opening quote
console.log('Chars around opening quote:', JSON.stringify(bundle.substring(openingQuote - 5, openingQuote + 10)));

// Now let's extract just the JSON value
// const ADMIN_HTML = " -> opening quote
const constLine = bundle.indexOf('const ADMIN_HTML = "');
console.log('\nconst ADMIN_HTML = " at:', constLine);
const jsonOpen = constLine + 'const ADMIN_HTML = "'.length;
const jsonClose = testStart + 1; // the " in ";const TEST_HTML = "
const jsonStr = bundle.substring(jsonOpen, jsonClose);
console.log('JSON string len:', jsonStr.length);
console.log('JSON start:', JSON.stringify(jsonStr.substring(0, 20)));
console.log('JSON end:', JSON.stringify(jsonStr.substring(jsonStr.length - 20)));

try {
  const html = JSON.parse(jsonStr);
  console.log('✅ Parsed HTML len:', html.length);
  const s = html.indexOf('<script>');
  const e = html.indexOf("</scr'+'ipt>");
  if (s >= 0 && e >= 0) {
    const script = html.substring(s + 8, e);
    console.log('Script len:', script.length);
    try {
      new Function(script);
      console.log('✅ new Function OK');
    } catch(err) {
      console.log('❌', err.message);
    }
  }
} catch(e) {
  console.log('Parse error:', e.message);
  // Show what's at the end of the string
  console.log('JSON tail 50:', JSON.stringify(jsonStr.substring(jsonStr.length - 50)));
  console.log('JSON tail 50 raw:', jsonStr.substring(jsonStr.length - 50));
}
