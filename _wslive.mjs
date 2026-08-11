import WebSocket from 'ws';
import { readFileSync } from 'fs';
const token = readFileSync('./_tok.txt', 'utf8').trim();
console.log('token len', token.length);
const ws = new WebSocket('wss://chathub.asia/chat?token=' + encodeURIComponent(token));
let got = [];
ws.on('open', () => { console.log('WS OPEN ok'); });
ws.on('message', (d) => {
  try { const m = JSON.parse(d.toString()); got.push(m.type); console.log('MSG type=', m.type); }
  catch (e) { console.log('raw', d.toString().slice(0, 80)); }
});
ws.on('error', (e) => { console.log('WS ERROR', e.message); process.exit(1); });
ws.on('close', (c, r) => { console.log('WS CLOSE', c, r.toString()); process.exit(0); });
setTimeout(() => {
  console.log('TYPES', got.join(','));
  if (!got.includes('init')) { console.log('NO INIT -> server WS broken'); process.exit(2); }
  console.log('INIT OK -> server WS works');
  process.exit(0);
}, 8000);
