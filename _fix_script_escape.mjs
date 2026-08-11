// Fix: replace </script> with \x3c/script> in HTML templates
// JSON.stringify preserves \xNN escapes, so \x3c stays as-is in the JS string
// In browser, \x3c = '<', so \x3c/script> = </script> (literal text, not HTML tag)
import { readFileSync, writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

const src = readFileSync(base + 'src/html_src.js', 'utf8');

// Only replace </script> within <script>...</script> blocks (i.e., in JS code inside templates)
let result = '';
let pos = 0;
while (pos < src.length) {
  // Find next <script>
  const scriptStart = src.indexOf('<script>', pos);
  if (scriptStart < 0) {
    result += src.substring(pos);
    break;
  }
  // Copy everything before it
  result += src.substring(pos, scriptStart + '<script>'.length);
  // Find the matching </script>
  let scriptEnd = src.indexOf('</script>', scriptStart);
  if (scriptEnd < 0) {
    result += src.substring(scriptStart + '<script>'.length);
    break;
  }
  scriptEnd += '</script>'.length;
  // Copy the script content, replacing </script> with \x3c/script>
  const scriptContent = src.substring(scriptStart + '<script>'.length, scriptEnd - '</script>'.length);
  result += scriptContent.replace(/<\/script>/g, '\\x3c/script>');
  // Copy </script> as-is
  result += '</script>';
  pos = scriptEnd;
}

const before = (src.match(/<\/script>/g) || []).length;
const after = (result.match(/<\/script>/g) || []).length;
console.log('Before fix: bare </script> count in source:', before);
console.log('After fix: bare </script> count in source:', after);

writeFileSync(base + 'src/html_src.js', result, 'utf8');
console.log('Fixed src/html_src.js written');

// Verify the fix works in the build pipeline
// Simulate: import + JSON.stringify
const mod = await import('data:text/javascript;base64,' + Buffer.from(result).toString('base64'));
const vals = ['HTML', 'ADMIN_HTML', 'TEST_HTML', 'ABOUT_HTML', 'PRICING_HTML'];
for (const k of vals) {
  const v = mod[k];
  if (!v) { console.log(k, 'MISSING'); continue; }
  const inHtml = (v.match(/<\/script>/g) || []).length;
  const inScript = (v.match(new RegExp('(?<=[^\\\\])<\/script>', 'g')) || []).length;
  // Check how many raw </script> are in script blocks
  const scripts = [];
  let si = 0;
  while ((si = v.indexOf('<script>', si)) >= 0) {
    const ei = v.indexOf('</script>', si);
    if (ei < 0) break;
    scripts.push(v.substring(si + 8, ei));
    si = ei + 9;
  }
  const scriptBares = scripts.join('').match(/<\/script>/g);
  console.log(k + ': len=' + v.length, 'raw </script> in scripts:', scriptBares ? scriptBares.length : 0);
  // Verify JSON.stringify output
  const json = JSON.stringify(v);
  const jsonBares = json.match(/<\/script>/g);
  console.log('  JSON.stringify: raw </script> count:', jsonBares ? jsonBares.length : 0, ' -> would be escaped?');
  // Check if they become \x3c/script>
  const escapedCount = (json.match(/\\x3c\/script>/g) || []).length;
  console.log('  \\x3c/script> count in JSON:', escapedCount);
}
