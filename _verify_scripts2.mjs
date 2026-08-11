import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// The bundle uses JS string literals: const HTML = "..."
// Let's find each template's start and estimate its value
// HTML starts at char 21 (after 'export const HTML = "')
// The template value ends at the first unescaped " after the opening "

// Find pattern: const HTML = "..." (the value starts right after the first ")
const patterns = ['const HTML = ', 'const ADMIN_HTML = ', 'const TEST_HTML = ', 'const ABOUT_HTML = ', 'const PRICING_HTML = '];

for (const pat of patterns) {
  const idx = bundle.indexOf(pat);
  if (idx < 0) { console.log(pat.trim(), 'NOT FOUND'); continue; }
  // The string value starts after the opening "
  const start = idx + pat.indexOf('"') + 1;
  // Actually: const HTML = " → the quote is at idx + pat.length - 1? No.
  // pat = 'const HTML = ' → length = 15. The " is at idx + 15.
  const valStart = idx + pat.length; // This is the opening "
  const firstChar = bundle[valStart];
  console.log(pat.trim(), 'starts at', valStart, 'first char:', JSON.stringify(firstChar));
  
  // Find the matching end quote
  let pos = valStart + 1;
  while (pos < bundle.length) {
    const ch = bundle[pos];
    if (ch === '\\') { pos += 2; continue; } // Skip escaped char
    if (ch === '"') break; // End of string
    pos++;
  }
  const valEnd = pos;
  const rawVal = bundle.substring(valStart + 1, valEnd);
  // Unescape for evaluation
  const val = rawVal
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
  
  console.log('  Raw length:', rawVal.length, 'Unescaped length:', val.length);
  
  // Extract script
  const s = val.indexOf('<script>');
  const e = val.indexOf('</script>');
  if (s < 0 || e < 0) { console.log('  NO SCRIPT TAG'); continue; }
  const script = val.substring(s + 8, e);
  console.log('  Script: ' + s + '-' + e + ' len=' + script.length);
  try {
    new Function(script);
    console.log('  ✅ new Function OK');
  } catch(err) {
    console.log('  ❌ ERROR:', err.message);
  }
}
