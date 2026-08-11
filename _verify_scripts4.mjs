import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// Use Function to evaluate the bundle and extract template values
// This properly handles all JS string escapes including \'
const extractTemplates = new Function(bundle + '\n; return {HTML, ADMIN_HTML, TEST_HTML, ABOUT_HTML, PRICING_HTML};');
const templates = extractTemplates();

let allOk = true;
for (const [name, html] of Object.entries(templates)) {
  if (!html) { console.log(name, ': EMPTY'); continue; }
  
  // Count script tags in the HTML value
  const s = (html.match(/<script>/g) || []).length;
  const e = (html.match(/<\/script>/g) || []).length;
  const splitClose = (html.match(/<\/scr'\+'\w+>/g) || []).length;
  console.log(name + ': len=' + html.length + ' <script>=' + s + ' </script>=' + e + ' split=' + splitClose);
  
  // Find the actual script content
  const sIdx = html.indexOf('<script>');
  const eIdx = html.indexOf('</script>');
  if (sIdx < 0 || eIdx < 0) {
    console.log('  NO SCRIPT TAG FOUND');
    // Check for split version
    const sIdx2 = html.indexOf("<scr'+'ipt>");
    if (sIdx2 >= 0) {
      console.log('  Found split script close at', sIdx2);
    }
    continue;
  }
  
  const script = html.substring(sIdx + 8, eIdx);
  console.log('  Script content: ' + sIdx + '-' + eIdx + ' (len=' + script.length + ')');
  
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
