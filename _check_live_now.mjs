import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const html = readFileSync(base + '_live_now.html', 'utf16le');
console.log('HTML length:', html.length);
const s = html.indexOf('<script>');
const e = html.indexOf('</script>');
const script = html.substring(s + 8, e);
console.log('Script length:', script.length);
try {
  new Function(script);
  console.log('[new Function] syntax: OK');
} catch(e) {
  console.log('[new Function] ERROR:', e.message);
  // Try binary search for error position
  let lo = 0, hi = script.length;
  while (hi - lo > 100) {
    const mid = Math.floor((lo + hi) / 2);
    try { new Function(script.substring(0, mid)); hi = mid; }
    catch(e2) { lo = mid; }
  }
  console.log('Error near char', lo, ':', JSON.stringify(script.substring(lo - 30, lo + 50)));
}
