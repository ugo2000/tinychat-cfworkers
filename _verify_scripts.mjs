import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// Extract each HTML template from the bundle JSON
const templates = {};
const names = ['HTML', 'ADMIN_HTML', 'TEST_HTML', 'ABOUT_HTML', 'PRICING_HTML'];
for (const name of names) {
  const key = JSON.stringify(name);
  const idx = bundle.indexOf(key + ':');
  if (idx < 0) { console.log(name, 'NOT FOUND'); continue; }
  // Find the colon, then the opening quote
  const qStart = bundle.indexOf('"', idx + key.length + 1);
  if (qStart < 0) continue;
  // Extract JSON string value
  const jsonStr = bundle.substring(qStart);
  try {
    const val = JSON.parse(jsonStr);
    templates[name] = val;
  } catch(e) {
    console.log(name, 'parse error:', e.message);
  }
}

// Now extract scripts from each HTML
let allOk = true;
for (const [name, html] of Object.entries(templates)) {
  if (!html) continue;
  const s = html.indexOf('<script>');
  const e = html.indexOf('</script>');
  if (s < 0) { console.log(name + ': NO SCRIPT TAG FOUND'); continue; }
  const script = html.substring(s + 8, e);
  console.log(name + ': script at ' + s + '-' + e + ' (len=' + script.length + ')');
  try {
    new Function(script);
    console.log(name + ' script: new Function OK');
  } catch(err) {
    console.log(name + ' script: ERROR -', err.message);
    allOk = false;
  }
}

if (allOk) console.log('\n✅ ALL SCRIPTS VALID');
else console.log('\n❌ SOME SCRIPTS BROKEN');
