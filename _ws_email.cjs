const https = require('https');
const { WebSocket } = require('ws');
const BASE = 'https://chathub.asia';
function post(path, body) {
  return new Promise((res, rej) => {
    const b = JSON.stringify(body);
    const opts = { hostname: 'chathub.asia', path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } };
    const req = https.request(opts, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: JSON.parse(d) })); });
    req.on('error', rej); req.write(b); req.end();
  });
}
async function main() {
  const a = 'wse_a' + Date.now();
  const b = 'wse_b' + Date.now();
  const email = `ws${Date.now()}@test.com`;
  const r1 = await post('/api/register', { username: a, password: 'test1234', email });
  console.log('Reg A:', r1.body.ok);
  const r2 = await post('/api/register', { username: b, password: 'test1234', email: `b${Date.now()}@test.com` });
  console.log('Reg B:', r2.body.ok);
  const la = await post('/api/login', { username: a, password: 'test1234' });
  const lb = await post('/api/login', { username: b, password: 'test1234' });
  const ta = la.body.token, tb = lb.body.token;

  let bInit = 0, bMsg = 0;
  const wsA = new WebSocket(`wss://chathub.asia/chat?token=${ta}`);
  const wsB = new WebSocket(`wss://chathub.asia/chat?token=${tb}`);
  wsB.on('open', () => { console.log('B open'); });
  wsB.on('message', d => {
    const m = JSON.parse(d);
    if (m.type === 'init') { bInit++; console.log('B got init, msgs:', m.messages?.length, 'users:', m.onlineUsers?.length); }
    if (m.type === 'message') bMsg++;
    if (bInit && bMsg === 2) { console.log('ALL PASS - B received', bInit, 'init +', bMsg, 'msgs'); wsA.close(); wsB.close(); process.exit(0); }
  });
  wsA.on('open', () => {
    wsA.send(JSON.stringify({ type: 'message', text: 'msg from A' }));
    setTimeout(() => wsA.send(JSON.stringify({ type: 'message', text: 'A again' })), 200);
  });
  wsA.on('error', e => console.log('A error:', e.message));
  wsB.on('error', e => console.log('B error:', e.message));
  setTimeout(() => { console.log('TIMEOUT - init:', bInit, 'msg:', bMsg); process.exit(1); }, 8000);
}
main().catch(console.error);
