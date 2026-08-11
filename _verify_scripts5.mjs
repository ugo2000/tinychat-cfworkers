import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// Extract each template value by parsing the bundle properly
// The bundle has: const HTML = "...json escaped value...";
// We need to parse the JSON string value

function extractJsonString(bundle, constName) {
  const pat = 'const ' + constName + ' = ';
  const idx = bundle.indexOf(pat);
  if (idx < 0) return null;
  
  // Find the opening " after "const HTML = "
  const qStart = idx + pat.length; // position of opening "
  
  // Parse JSON from that position
  // The JSON string value ends at the first unescaped " at depth 0
  let pos = qStart + 1;
  let escaped = false;
  while (pos < bundle.length) {
    const ch = bundle[pos];
    if (escaped) { escaped = false; pos++; continue; }
    if (ch === '\\') { escaped = true; pos++; continue; }
    if (ch === '"') {
      // Found closing quote
      const jsonStr = bundle.substring(qStart, pos + 1);
      try {
        return JSON.parse(jsonStr);
      } catch(e) {
        // Try with Function eval (handles more JS escapes like \')
        try {
          return (new Function('return ' + jsonStr))();
        } catch(e2) {
          return null;
        }
      }
    }
    pos++;
  }
  return null;
}

const names = ['HTML', 'ADMIN_HTML', 'TEST_HTML', 'ABOUT_HTML', 'PRICING_HTML'];
let allOk = true;
for (const name of names) {
  const html = extractJsonString(bundle, name);
  if (!html) { console.log(name + ': FAILED TO EXTRACT'); continue; }
  
  console.log(name + ': len=' + html.length);
  
  // Check for split script close tag
  const splitClose = (html.match(/<\/scr'\+'\w+>/g) || []).length;
  console.log('  Split script close tags:', splitClose);
  
  // Count real </script> (should be 0 if split worked)
  const realClose = (html.match(/<\/script>/g) || []).length;
  console.log('  Real </script> in HTML:', realClose);
  
  // Find script content
  const sIdx = html.indexOf('<script>');
  const eIdx = html.indexOf('</script>');
  if (sIdx < 0 || eIdx < 0) { console.log('  NO SCRIPT TAG'); continue; }
  
  const script = html.substring(sIdx + 8, eIdx);
  console.log('  Script: ' + sIdx + '-' + eIdx + ' (len=' + script.length + ')');
  
  try {
    new Function(script);
    console.log('  ✅ new Function OK');
  } catch(err) {
    console.log('  ❌ ERROR:', err.message);
    allOk = false;
  }
}

if (allOk) console.log('\n✅ ALL SCRIPTS VALID');
else console.log('\n❌ SOME SCRIPTS BROKEN');
