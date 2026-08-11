import WebSocket from 'ws';
console.log('Testing WebSocket: wss://chathub.asia/chat');

const ws = new WebSocket('wss://chathub.asia/chat?token=test');
let settled = false;

ws.on('open', () => {
  console.log('WS OPEN - Connection successful!');
  settled = true;
  ws.close();
  process.exit(0);
});

ws.on('error', (e) => {
  console.log('WS ERROR:', e.message);
  if (!settled) { settled = true; process.exit(1); }
});

ws.on('close', (code, reason) => {
  console.log('WS CLOSE code:', code, 'reason:', reason.toString());
  if (!settled) { settled = true; process.exit(0); }
});

setTimeout(() => {
  if (!settled) {
    console.log('TIMEOUT - No connection within 10s');
    process.exit(1);
  }
}, 10000);
