import { readFileSync } from 'fs';
// Read the bundle as raw bytes to check for the actual JSON string
const bundle = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');

// Find the ADMIN_HTML value - it's stored as: const ADMIN_HTML = JSON.stringify(...)
// Let me find where this starts in the bundle
const start = bundle.indexOf('const ADMIN_HTML = ');
console.log('Found at:', start);

// Show context
console.log('Context:', bundle.substring(start, start + 100));

// The value is JSON, find the opening quote
const qStart = start + 'const ADMIN_HTML = '.length;
console.log('JSON starts with:', JSON.stringify(bundle.substring(qStart, qStart + 10)));

// Now find the closing quote using proper JSON parsing
// We'll read char by char tracking escapes
let i = qStart + 1; // skip opening "
let escaped = false;
let inStr = true;

while (i < bundle.length && inStr) {
  const ch = bundle[i];
  if (escaped) { escaped = false; i++; continue; }
  if (ch === '\\') { escaped = true; i++; continue; }
  if (ch === '"') { inStr = false; break; }
  i++;
}

const jsonStr = bundle.substring(qStart, i);
console.log('JSON string len:', jsonStr.length);
console.log('JSON tail:', JSON.stringify(jsonStr.substring(jsonStr.length - 30)));

// Parse it
try {
  const html = JSON.parse(jsonStr);
  console.log('\nParsed HTML len:', html.length);
  
  const s = html.indexOf('<script>');
  const e = html.indexOf("</scr'+'ipt>");
  console.log('Script from', s+8, 'to', e, 'len:', s >= 0 && e >= 0 ? e - s - 8 : 'N/A');
  
  if (s >= 0 && e >= 0) {
    const script = html.substring(s + 8, e);
    console.log('Script len:', script.length, 'lines:', script.split('\n').length);
    console.log('Has approvePay:', script.includes('approvePay'));
    console.log('Has async function approvePay:', script.includes('async function approvePay'));
    
    try {
      new Function(script);
      console.log('✅ new Function OK');
    } catch(err) {
      console.log('❌', err.message);
    }
  }
} catch(e) {
  console.log('Parse error:', e.message);
  // Show bytes around the error position
  const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
  console.log('Error context:', JSON.stringify(jsonStr.substring(Math.max(0, pos-30), pos+30)));
}
