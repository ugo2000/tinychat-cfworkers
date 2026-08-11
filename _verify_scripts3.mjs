import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// Extract each HTML template using proper JSON parsing
const patterns = [
  ['HTML', 'const HTML = '],
  ['ADMIN_HTML', 'const ADMIN_HTML = '],
  ['TEST_HTML', 'const TEST_HTML = '],
  ['ABOUT_HTML', 'const ABOUT_HTML = '],
  ['PRICING_HTML', 'const PRICING_HTML = '],
];

let allOk = true;
for (const [name, pat] of patterns) {
  const idx = bundle.indexOf(pat);
  if (idx < 0) { console.log(name, 'NOT FOUND'); continue; }
  
  // Find the opening " of the string value
  const qIdx = idx + pat.length; // position of opening "
  
  // Parse JSON string from that position
  let jsonStr = '';
  let depth = 0;
  let i = qIdx;
  // Find the matching closing " by parsing properly
  try {
    // Try to parse from the quote position
    const substr = bundle.substring(qIdx);
    // The value is a JSON string, parse it
    // Find where the string ends (matching quote at depth 0)
    let j = 0;
    let inStr = false;
    while (j < substr.length) {
      const ch = substr[j];
      if (!inStr && ch === '"') {
        inStr = true;
        j++;
        continue;
      }
      if (!inStr) { j++; continue; }
      if (ch === '\\') { j += 2; continue; }
      if (ch === '"') {
        // End of string
        jsonStr = substr.substring(0, j);
        break;
      }
      j++;
    }
    
    const html = JSON.parse(jsonStr);
    console.log(name + ': length=' + html.length);
    
    // Find script tag
    const s = html.indexOf('<script>');
    const e = html.indexOf('</script>');
    if (s < 0 || e < 0) { console.log('  NO SCRIPT TAG'); continue; }
    const script = html.substring(s + 8, e);
    console.log('  Script: ' + s + '-' + e + ' len=' + script.length);
    try {
      new Function(script);
      console.log('  ✅ new Function OK');
    } catch(err) {
      console.log('  ❌ ERROR:', err.message);
      allOk = false;
    }
  } catch(e) {
    console.log(name, 'parse error:', e.message);
    console.log('  jsonStr:', jsonStr.substring(0, 100));
  }
}

if (allOk) console.log('\n✅ ALL SCRIPTS VALID');
else console.log('\n❌ SOME SCRIPTS BROKEN');
