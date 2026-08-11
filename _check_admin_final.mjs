import { readFileSync } from 'fs';
const bundle = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');

// Find all const = " patterns to understand the structure
const allConsts = [];
let pos = 0;
while ((pos = bundle.indexOf('const ADMIN_HTML = "', pos)) >= 0) {
  console.log('ADMIN_HTML JSON open at:', pos);
  pos += 5;
}
pos = 0;
while ((pos = bundle.indexOf('";const TEST_HTML', pos)) >= 0) {
  console.log('Before TEST_HTML at:', pos);
  console.log('  Chars:', JSON.stringify(bundle.substring(pos - 5, pos + 25)));
  pos += 5;
}

// The actual JSON value for ADMIN_HTML starts at the opening " after const ADMIN_HTML = 
// and ends at the " before ;const TEST_HTML
const adminConstPos = bundle.indexOf('const ADMIN_HTML = "');
const beforeTest = bundle.indexOf('";const TEST_HTML');
console.log('\nconst ADMIN_HTML = " at:', adminConstPos);
console.log('";const TEST_HTML at:', beforeTest);

const jsonStart = adminConstPos + 'const ADMIN_HTML = "'.length;
const jsonEnd = beforeTest + 1; // the " just before ;const TEST_HTML
console.log('JSON start at:', jsonStart, 'char:', JSON.stringify(bundle[jsonStart]));
console.log('JSON end at:', jsonEnd, 'char:', JSON.stringify(bundle[jsonEnd - 1]), JSON.stringify(bundle[jsonEnd]));

const jsonStr = bundle.substring(jsonStart, jsonEnd);
console.log('JSON len:', jsonStr.length);
console.log('JSON start 20:', JSON.stringify(jsonStr.substring(0, 20)));
console.log('JSON end 20:', JSON.stringify(jsonStr.substring(jsonStr.length - 20)));

try {
  const html = JSON.parse(jsonStr);
  console.log('✅ Parsed! HTML len:', html.length);
  const s = html.indexOf('<script>');
  const splitClose = "</scr'+'ipt>";
  const e = html.indexOf(splitClose);
  console.log('script tag s:', s, 'e:', e);
  if (s >= 0 && e >= 0) {
    const script = html.substring(s + 8, e);
    console.log('Script len:', script.length);
    try {
      new Function(script);
      console.log('✅ new Function OK - BUNDLE IS CLEAN');
    } catch(err) {
      console.log('❌', err.message);
    }
  }
} catch(e) {
  console.log('Parse error:', e.message);
  // Show what chars are at positions around the error
  const m = e.message.match(/position (\d+)/);
  if (m) {
    const pos = parseInt(m[1]);
    console.log('Context around pos', pos, ':', JSON.stringify(jsonStr.substring(Math.max(0, pos-30), pos+30)));
  }
}
