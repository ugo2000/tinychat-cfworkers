import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const html = readFileSync(base + '_front_now.html', 'utf8');
const s = html.indexOf('<script>');
const e = html.indexOf('</script>');
const script = html.substring(s + 8, e);
console.log('Script length:', script.length);

const checks = [
  ['input-bar', html.includes('input-bar')],
  ['msg-area', html.includes('msg-area')],
  ['sendMsg fn', script.includes('function sendMsg')],
  ['handleWSMessage', script.includes('function handleWSMessage')],
  ['connectWS', script.includes('function connectWS')],
  ['addMessage', script.includes('function addMessage')],
  ['doSend', script.includes('doSend')],
  ['msgInput', html.includes('id="msgInput"')],
  ['btnSend', html.includes('btnSend')],
  ['sendMsg onclick', script.includes('sendMsg')],
];
checks.forEach(([name, ok]) => console.log(ok ? '[OK]' : '[MISSING]', name));

try {
  new Function(script);
  console.log('\n[new Function] syntax: OK');
} catch(e) {
  console.log('\n[new Function] ERROR:', e.message);
}

// Show the send button HTML
const sendLine = html.split('\n').find(l => l.includes('btnSend') || l.includes('sendMsg') && l.includes('button'));
if (sendLine) console.log('\nSend button HTML:', sendLine.trim().substring(0, 200));

// Show input-bar section
const idx1 = html.indexOf('input-bar');
if (idx1 >= 0) console.log('\ninput-bar context:', JSON.stringify(html.substring(idx1 - 50, idx1 + 300)));
