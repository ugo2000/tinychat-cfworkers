import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// Find the ADMIN_HTML const in the bundle
const adminStart = bundle.indexOf('const ADMIN_HTML = ');
if (adminStart < 0) { console.log('no ADMIN_HTML'); process.exit(1); }

// Start of JSON string value (after "const ADMIN_HTML = ")
let strStart = adminStart + 'const ADMIN_HTML = '.length; // points to opening "
console.log('JSON string starts at:', strStart, 'char:', JSON.stringify(bundle.substring(strStart, strStart + 10)));

// Find the end of the JSON string by walking through it
let pos = strStart + 1;
let depth = 0;
while (pos < bundle.length) {
  const ch = bundle[pos];
  if (ch === '\\') { pos += 2; continue; }
  if (ch === '"') {
    // Is this a real close or inside a string? Look at what follows
    const after = bundle.substring(pos, pos + 30);
    if (after.match(/^"(?:\s*;|\s*\n|\s*)$/)) {
      pos++; break; // real end
    }
    // It might be the end of the value but followed by more JSON structure
    // Check if it's the last " before "; or the actual close
    // Actually let's just find the longest possible JSON string ending
    const context = bundle.substring(pos, pos + 50);
    if (context.includes('";') || context.includes('"\n')) {
      pos++; break;
    }
  }
  pos++;
}

const jsonSlice = bundle.substring(strStart, pos);
console.log('JSON string length:', jsonSlice.length);

// Check if the JSON is actually complete
// The issue might be that </script> in the HTML breaks the JSON string
// Let's check if JSON.parse works
try {
  const adminHtml = JSON.parse(jsonSlice);
  console.log('JSON parsed OK, length:', adminHtml.length);
  const s = adminHtml.indexOf('<script>');
  const e = adminHtml.indexOf('</script>');
  console.log('script:', s, 'to', e, 'len:', e - s - 8);
  const script = adminHtml.substring(s + 8, e);
  try { new Function(script); console.log('script syntax OK'); }
  catch(e2) { console.log('script ERROR:', e2.message); }
} catch(e2) {
  console.log('JSON parse ERROR:', e2.message);
  // Show context around error
  console.log('Context:', JSON.stringify(bundle.substring(strStart + 10, strStart + 200)));
  // Find the actual " end position
  // Search for the closing " that precedes a semicolon
  let closePos = bundle.indexOf('";', strStart);
  if (closePos >= 0 && closePos < strStart + 1000) {
    console.log('First close "; at:', closePos);
  }
  closePos = bundle.indexOf('"\n', strStart);
  if (closePos >= 0 && closePos < strStart + 1000) {
    console.log('First close "\n at:', closePos);
  }
}
