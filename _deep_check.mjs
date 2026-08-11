import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// Find the admin HTML in the bundle - search backwards from the end for const ADMIN_HTML
const adminStart = bundle.indexOf('const ADMIN_HTML = ');
const idx = adminStart + 'const ADMIN_HTML = '.length;
let pos = idx + 1; // skip opening "
let depth = 0;
while (pos < bundle.length) {
  if (bundle[pos] === '\\') { pos += 2; continue; }
  if (bundle[pos] === '"') {
    const after = bundle.substring(pos, pos + 10);
    if (after.match(/^"(?:\s*;)/)) { pos++; break; }
  }
  pos++;
}
const jsonSlice = bundle.substring(idx, pos);
console.log('json len:', jsonSlice.length, 'first:', JSON.stringify(jsonSlice.substring(0, 20)));
let adminHtml;
try { adminHtml = JSON.parse(jsonSlice); }
catch(e) { console.log('JSON fail'); process.exit(1); }

// The actual </script> within admin HTML
const s = adminHtml.indexOf('<script>');
const e = adminHtml.indexOf('</script>');
const script = adminHtml.substring(s + 8, e);
console.log('script from JSON:', script.length, 'chars');
console.log('last 100 chars:', JSON.stringify(script.substring(script.length - 100)));
console.log('chars at end:', script.substring(script.length - 5).split('').map(c => c.charCodeAt(0)));

// Now check the raw bundle bytes around the closing </script>
// We need to find where the admin HTML ends in the bundle
// In the bundle, the HTML is JSON encoded: const HTML = "..."
// So "<\/script>" would appear as <\/script> in the bundle
const bundleScriptEnd = bundle.indexOf('<\\/script>', s >= 0 ? bundle.indexOf('const HTML') : 0);
console.log('\nIn bundle, <\\/script> pattern at:', bundleScriptEnd);
if (bundleScriptEnd >= 0) {
  console.log('bundle around end:', JSON.stringify(bundle.substring(bundleScriptEnd - 20, bundleScriptEnd + 50)));
}

// Check if the closing </script> has escape chars
const rawScriptEnd = bundle.indexOf('</script>', bundle.indexOf('const ADMIN_HTML'));
console.log('Raw </script> in bundle:', rawScriptEnd >= 0 ? 'FOUND at ' + rawScriptEnd : 'NOT FOUND');
if (rawScriptEnd >= 0) {
  console.log('raw end:', JSON.stringify(bundle.substring(rawScriptEnd - 20, rawScriptEnd + 30)));
}

// Also: check if the bundle has 'approvePay' function definition (not onclick)
const approveFuncIdx = bundle.indexOf('async function approvePay');
console.log('\napprovePay function in bundle at:', approveFuncIdx);
if (approveFuncIdx >= 0) {
  console.log('context:', JSON.stringify(bundle.substring(approveFuncIdx - 100, approveFuncIdx + 50)));
}

// Check if the bundle has 'function approvePay' (non-async)
const plainApproveIdx = bundle.indexOf('function approvePay');
console.log('plain function approvePay in bundle:', plainApproveIdx >= 0 ? 'FOUND at ' + plainApproveIdx : 'NOT FOUND');

// Check what's in the actual closing part of the admin HTML JSON
const adminHtmlJson = JSON.stringify(adminHtml);
const scriptTagInJson = adminHtmlJson.indexOf('<\\/script>');
console.log('\nIn JSON of admin HTML, <\\/script> at:', scriptTagInJson);
if (scriptTagInJson >= 0) {
  console.log('context:', JSON.stringify(adminHtmlJson.substring(scriptTagInJson - 20, scriptTagInJson + 30)));
}

// Most importantly: let's look at what actual string new Function receives
// by trying to eval a minimal version
try {
  // Try to eval just the last part
  const lastPart = script.substring(script.length - 200);
  console.log('\nLast 200 of script:', JSON.stringify(lastPart));
  new Function(script);
} catch(e) {
  console.log('\nnew Function error:', e.message);
  // Check if there's any issue with the closing
  const closing = script.substring(script.length - 20);
  console.log('Closing 20 chars:', JSON.stringify(closing));
  console.log('Char codes:', closing.split('').map(c => c.charCodeAt(0)));
}
