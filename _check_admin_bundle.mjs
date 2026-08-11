import { readFileSync } from 'fs';
const bundle = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/dist/index.js', 'utf8');

// Find ADMIN_HTML const value (JSON string)
const start = bundle.indexOf('const ADMIN_HTML = ');
const after = start + 'const ADMIN_HTML = '.length;
console.log('ADMIN_HTML starts at', start, 'JSON at', after, 'char:', JSON.stringify(bundle[after]));

// Find the JSON string
let i = after + 1; // skip opening "
let inStr = false, escaped = false;
while (i < bundle.length) {
  const ch = bundle[i];
  if (escaped) { escaped = false; i++; continue; }
  if (ch === '\\') { escaped = true; i++; continue; }
  if (ch === '"') {
    if (!inStr) { inStr = true; }
    else {
      // closing quote
      const jsonStr = bundle.substring(after, i + 1);
      console.log('JSON string len', jsonStr.length, 'ends at', i);
      try {
        const html = JSON.parse(jsonStr);
        console.log('Parsed HTML len:', html.length);
        const s = html.indexOf('<script>');
        const e = html.indexOf("</scr'+'ipt>");
        if (s >= 0 && e >= 0) {
          const script = html.substring(s + 8, e);
          console.log('Script len:', script.length, 'lines:', script.split('\n').length);
          try {
            new Function(script);
            console.log('✅ new Function OK');
          } catch(err) {
            console.log('❌', err.message);
            const m = err.message.match(/at position (\d+)/);
            if (m) {
              const pos = parseInt(m[1]);
              const lines = script.split('\n');
              let ls = 0;
              for (let li = 0; li < lines.length; li++) {
                const le = ls + lines[li].length + 1;
                if (ls <= pos && pos < le) {
                  console.log('Error on line', li+1, ':', lines[li]);
                  if (li > 0) console.log('Line', li, ':', lines[li-1]);
                  if (li < lines.length - 1) console.log('Line', li+2, ':', lines[li+1]);
                  break;
                }
                ls = le;
              }
            }
          }
        }
      } catch(e) {
        console.log('JSON parse error:', e.message);
        // Show the tail of the json string
        console.log('JSON tail:', JSON.stringify(jsonStr.substring(jsonStr.length - 50)));
        console.log('Bundle at end:', JSON.stringify(bundle.substring(i - 10, i + 20)));
      }
      break;
    }
  }
  i++;
}
