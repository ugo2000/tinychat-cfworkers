import { readFileSync, writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// Find the admin script: after 'ADMIN_HTML = ' JSON string
// We need to extract the JSON string value of ADMIN_HTML from the bundle
// The bundle has: const ADMIN_HTML = "..."; (JSON encoded)
// We can find the start and use a simple JSON string extractor

const adminStart = bundle.indexOf('const ADMIN_HTML = ');
if (adminStart < 0) { console.log('Cannot find ADMIN_HTML'); process.exit(1); }

// Extract the JSON string value
let idx = adminStart + 'const ADMIN_HTML = '.length;
if (bundle[idx] !== '"') { console.log('Not a string at', idx, bundle.substring(idx, idx+10)); process.exit(1); }

// Find matching closing quote (accounting for escapes)
let end = idx + 1;
while (end < bundle.length) {
  const ch = bundle[end];
  if (ch === '\\') { end += 2; continue; }
  if (ch === '"') { end++; break; }
  end++;
}
const jsonStr = bundle.substring(idx, end);
console.log('ADMIN_HTML JSON length:', jsonStr.length);

// Decode the JSON string to get the actual HTML
let adminHtml;
try { adminHtml = JSON.parse(jsonStr); }
catch(e) { console.log('JSON parse error:', e.message); process.exit(1); }
console.log('Admin HTML length:', adminHtml.length);

// Now extract the embedded script
const s = adminHtml.indexOf('<script>');
const e = adminHtml.indexOf('</script>');
if (s < 0 || e < 0) { console.log('No script found'); process.exit(1); }
const script = adminHtml.substring(s + 8, e);
console.log('Admin script length:', script.length);
writeFileSync(base + '_bundle_admin_script.js', script);

// Check syntax
try {
  new Function(script);
  console.log('\n[new Function] syntax: OK');
} catch(err) {
  console.log('\n[new Function] ERROR:', err.message);
  // Find error position via binary search
  let lo = 0, hi = script.length;
  for (let i = 0; i < 50; i++) {
    const mid = Math.floor((lo + hi) / 2);
    try { new Function(script.substring(0, mid)); hi = mid; }
    catch(e2) { lo = mid; }
    if (hi - lo < 5) break;
  }
  const errPos = lo;
  console.log('Error near char', errPos, ':', JSON.stringify(script.substring(Math.max(0, errPos - 50), errPos + 100)));
  // Show context lines
  const lines = script.split('\n');
  let charCount = 0;
  for (let i = 0; i < lines.length; i++) {
    if (charCount + lines[i].length >= errPos) {
      console.log('Error around line', i + 1, '(offset', errPos - charCount, 'in line)');
      for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 5); j++) {
        console.log('  L' + (j + 1) + ':', JSON.stringify(lines[j]));
      }
      break;
    }
    charCount += lines[i].length + 1;
  }
}

// Check for </scr in the script (bare)
const badPos = script.indexOf('</scr');
if (badPos >= 0) {
  console.log('\n</scr found in script at:', badPos, JSON.stringify(script.substring(badPos - 30, badPos + 50)));
}
