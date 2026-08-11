import { readFileSync } from 'fs';
const bundle = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');

// Find all </html>" patterns to identify where each HTML constant ends
let pos = 0;
const closes = [];
while ((pos = bundle.indexOf('</html>"', pos)) >= 0) {
  closes.push(pos);
  pos += 7;
}
console.log('Found', closes.length, 'occurrences of </html>":');
closes.forEach((p, i) => {
  const after = bundle.substring(p + 7, p + 20);
  console.log(' ', i + 1, 'at', p, ':', JSON.stringify(after));
});

// Find const ADMIN_HTML
const adminConst = bundle.indexOf('const ADMIN_HTML = ');
console.log('\nconst ADMIN_HTML at:', adminConst);

// Find which </html>" comes right before it
const prev = closes.filter(p => p < adminConst);
console.log('</html>" before ADMIN_HTML:', prev[prev.length - 1]);

// The closing quote of ADMIN_HTML is at the </html>" that is followed by ";const" or ";export"
const closingIdx = closes.find(p => {
  const after = bundle.substring(p + 7, p + 20);
  return after.includes('";') || after.includes('";\n');
});
console.log('ADMIN_HTML closing </html>" at:', closingIdx);

// Actually let's find the right one by looking for </html>" followed by ;const or similar
const realClose = closes.filter(p => {
  const after = bundle.substring(p + 7, p + 30);
  return after.startsWith('";') || after.startsWith('";\n');
});
console.log('\nReal closes:</html>" followed by ";:');
realClose.forEach((p, i) => {
  const after = bundle.substring(p + 7, p + 30);
  console.log(' ', i + 1, 'at', p, ':', JSON.stringify(after));
});

// The ADMIN_HTML closing quote should be the one right before "const TEST_HTML"
const testConst = bundle.indexOf('const TEST_HTML = ');
console.log('\nconst TEST_HTML at:', testConst);
const adminClose = closes.filter(p => p < testConst).pop();
console.log('ADMIN_HTML closes at:', adminClose);
const afterClose = bundle.substring(adminClose, adminClose + 20);
console.log('After close:', JSON.stringify(afterClose));

// Now extract ADMIN_HTML JSON value
const adminConstPos = bundle.indexOf('const ADMIN_HTML = ');
const jsonStart = adminConstPos + 'const ADMIN_HTML = '.length + 1; // +1 for opening "
const closingQuote = adminClose + 6; // </html>" - the " is at +6
const jsonStr = bundle.substring(jsonStart, closingQuote);
console.log('\nADMIN_HTML JSON len:', jsonStr.length);
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
      console.log('✅ new Function OK');
    } catch(err) {
      console.log('❌', err.message);
      const m = err.message.match(/at position (\d+)/);
      if (m) {
        const pos = parseInt(m[1]);
        const lines = script.split('\n');
        let ls = 0;
        for (let li = 0; li < lines.length; li++) {
          const le = ls + lines[li].length + 1;
          if (ls <= pos && pos < le) {
            console.log('Error on line', li+1, ':', lines[li]);
            if (li > 0) console.log('Prev line', li, ':', lines[li-1]);
            break;
          }
          ls = le;
        }
      }
    }
  }
} catch(e) {
  console.log('Parse error:', e.message);
}
