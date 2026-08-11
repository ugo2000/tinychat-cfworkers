import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// Find the admin section
const adminIdx = bundle.indexOf('"const ADMIN_HTML = "');
console.log('ADMIN_HTML pattern found at:', adminIdx);

// Find the actual const declaration
const constIdx = bundle.indexOf("const ADMIN_HTML = ");
console.log('const ADMIN_HTML at:', constIdx);

// Find all function definitions starting with async or function
const funcPats = [
  'async function doLogin',
  'function render',
  'async function uploadQR',
  'async function loadPending',
  'async function approvePay',
];

for (const pat of funcPats) {
  const pos = bundle.indexOf(pat);
  if (pos >= 0) {
    const snippet = bundle.substring(pos, pos + 60);
    console.log(pat + ' found at', pos, ':', JSON.stringify(snippet));
  } else {
    console.log(pat + ': NOT FOUND in bundle');
  }
}

// Now check the actual JSON string content
// The bundle has: const ADMIN_HTML = "...json...";
// Let's find the opening " after "const ADMIN_HTML = "
const startQ = constIdx + "const ADMIN_HTML = ".length;
console.log('\nFirst 20 chars at pos', startQ, ':', JSON.stringify(bundle.substring(startQ, startQ + 20)));

// Find the JSON string boundaries
let depth = 0;
let inStr = false;
let escaped = false;
let i = startQ + 1; // skip opening "
let lastGood = startQ;

while (i < bundle.length) {
  const ch = bundle[i];
  if (escaped) { escaped = false; i++; lastGood = i; continue; }
  if (ch === '\\') { escaped = true; i++; lastGood = i; continue; }
  if (ch === '"') {
    if (!inStr) {
      inStr = true;
    } else {
      // Closing quote at depth 0
      if (depth === 0) {
        const jsonStr = bundle.substring(startQ, i + 1);
        console.log('\nJSON string ends at', i, 'len=', jsonStr.length);
        try {
          const html = JSON.parse(jsonStr);
          console.log('JSON parsed, html len=', html.length);
          
          // Extract script
          const s = html.indexOf('<script>');
          const e = html.indexOf('</scr'+'ipt>');
          if (s >= 0 && e >= 0) {
            const script = html.substring(s + 8, e);
            console.log('Script:', s + 8, '-', e, 'len=', script.length);
            
            // Check for approvePay
            const ap = script.indexOf('async function approvePay');
            console.log('async function approvePay at:', ap);
            if (ap < 0) {
              const ap2 = script.indexOf('function approvePay');
              console.log('function approvePay at:', ap2);
            }
            
            // Count function definitions
            const funcs = (script.match(/async function \w+|function \w+/g) || []);
            console.log('Function count:', funcs.length);
            console.log('Functions:', funcs.join(', '));
            
            try {
              new Function(script);
              console.log('✅ new Function OK');
            } catch(err) {
              console.log('❌ ERROR:', err.message);
              const m = err.message.match(/at position (\d+)/);
              if (m) {
                const pos = parseInt(m[1]);
                console.log('Context:', JSON.stringify(script.substring(Math.max(0, pos-80), pos+80)));
              }
            }
          } else {
            console.log('NO SCRIPT TAG FOUND');
          }
        } catch(e) {
          console.log('JSON parse error:', e.message);
        }
        break;
      }
      inStr = false;
    }
  }
  i++;
}
