import { execSync } from 'child_process';
// Extract ADMIN_HTML from html_src.js by evaluating the template
// The file uses template literals with export const ADMIN_HTML = `...`;
import { readFileSync } from 'fs';
const src = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');

// Find ADMIN_HTML template boundaries
const start = src.indexOf('export const ADMIN_HTML = `');
if (start < 0) { console.log('ADMIN_HTML not found'); process.exit(1); }
const tplStart = start + 'export const ADMIN_HTML = `'.length;
// Find matching closing backtick (careful: template may contain escaped backticks)
let i = tplStart, depth = 0;
let inTpl = false, inStr = null, escaped = false;
let end = -1;
// Simpler: find the next line that is exactly "`;" or starts with "`;"
const tplEnd = src.indexOf('`;', tplStart);
if (tplEnd < 0) { console.log('closing backtick not found'); process.exit(1); }
const tpl = src.substring(tplStart, tplEnd);

// Evaluate the template manually - handle escapes: \\ and \` and \$
// For our purposes, just replace \` with ` and \\ with \ (simple)
let html = tpl;
// Check for the Q line
const qLine = html.split('\n').find(l => l.includes('fromCharCode(39)'));
console.log('Q line present:', !!qLine);

// Find script
const s = html.indexOf('<script>');
const e = html.indexOf("</scr'+'ipt>");
console.log('script at', s, 'close at', e);
if (s >= 0 && e >= 0) {
  const script = html.substring(s + 8, e);
  console.log('Script len:', script.length, 'lines:', script.split('\n').length);
  try {
    new Function(script);
    console.log('✅ ADMIN script new Function OK');
  } catch(err) {
    console.log('❌', err.message);
  }
}
