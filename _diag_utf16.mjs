import { readFileSync, writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

// Read as UTF-16LE (what curl wrote)
const html = readFileSync(base + '_front_now.html', 'utf16le');
console.log('HTML length (UTF-16LE):', html.length);

// Now check
const s = html.indexOf('<script>');
const e = html.indexOf('</script>');
console.log('First <script> at:', s, 'first </script> at:', e);
console.log('Extracted script len:', s >= 0 && e >= 0 ? e - s - 8 : 'N/A');

if (s >= 0 && e >= 0) {
  const script = html.substring(s + 8, e);
  console.log('\nScript length:', script.length);
  const checks = [
    ['input-bar', html.includes('input-bar')],
    ['msg-area', html.includes('msg-area')],
    ['sendMsg function', script.includes('function sendMsg')],
    ['handleWSMessage', script.includes('function handleWSMessage')],
    ['connectWS', script.includes('function connectWS')],
    ['doSend', script.includes('doSend')],
    ['msgInput id', html.includes('id="msgInput"')],
    ['btnSend id', html.includes('btnSend')],
  ];
  checks.forEach(([name, ok]) => console.log(ok ? '[OK]' : '[MISSING]', name));
  
  try {
    new Function(script);
    console.log('\n[new Function] syntax: OK');
  } catch(e) {
    console.log('\n[new Function] ERROR:', e.message);
    console.log('Line:', e.lineNumber || 'n/a');
  }
} else {
  console.log('\nNo script found!');
}
