import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

const html = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/_home_live.html', 'utf8');

const errors = [];
const logs = [];

const dom = new JSDOM(html, {
  url: 'https://chathub.asia/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});

const { window } = dom;

// Capture errors
window.addEventListener('error', e => errors.push('window.onerror: ' + e.message));
window.addEventListener('unhandledrejection', e => errors.push('unhandledrejection: ' + (e.reason && e.reason.message || e.reason)));

// Stub WebSocket
let lastWs = null;
class FakeWS {
  constructor(url) { this.url = url; this.readyState = 0; lastWs = this; logs.push('WS created: ' + url); }
  send(data) { logs.push('WS send: ' + data.substring(0, 120)); }
  close() { this.readyState = 3; logs.push('WS closed'); }
}
window.WebSocket = FakeWS;

// Stub fetch (not needed for init, but safe)
window.fetch = async () => { throw new Error('fetch not mocked'); };

// localStorage is provided by jsdom

try {
  // Extract and run the script
  const s = html.indexOf('<script>');
  const split = html.indexOf("</scr'+'ipt>");
  const script = html.substring(s + 8, split);
  window.eval(script);
  logs.push('SCRIPT EXECUTED OK');

  // Check state after init
  const msgInput = window.document.getElementById('msgInput');
  logs.push('msgInput.disabled after init: ' + msgInput.disabled);
  const loginPage = window.document.getElementById('pageLogin');
  const chatPage = window.document.getElementById('pageChat');
  logs.push('login page active: ' + loginPage.classList.contains('active'));
  logs.push('chat page active: ' + chatPage.classList.contains('active'));

  // Simulate: user has token -> re-run init path via startChat
  window.localStorage.setItem('tinychat_token', 'fake-token');
  window.localStorage.setItem('tinychat_username', 'tester');
  // call the init-like path: startChat is exposed on window if script defined it
  if (typeof window.startChat === 'function') {
    window.startChat();
    logs.push('startChat called, chat page active: ' + chatPage.classList.contains('active'));
    logs.push('WS created count: ' + (lastWs ? 'yes' : 'no'));
    if (lastWs && typeof lastWs.onopen === 'function') {
      lastWs.onopen();
      logs.push('WS onopen fired');
      // simulate init message
      if (typeof lastWs.onmessage === 'function') {
        lastWs.onmessage({ data: JSON.stringify({ type: 'init', messages: [], online: [], geo: 'Beijing, CN' }) });
        logs.push('init msg handled');
        logs.push('msgInput.disabled after init msg: ' + msgInput.disabled);
      }
    }
  } else {
    logs.push('startChat NOT exposed on window');
  }
} catch (e) {
  errors.push('EXEC ERROR: ' + e.stack || e.message);
}

console.log('=== ERRORS (' + errors.length + ') ===');
errors.forEach(e => console.log('❌ ' + e));
if (!errors.length) console.log('(no errors)');

console.log('\n=== LOGS ===');
logs.forEach(l => console.log('  ' + l));
