const https = require('https');
const { WebSocket } = require('ws');
function get(path) {
  return new Promise((res, rej) => {
    const req = https.get({ hostname: 'tinychat.yujiangbiao2000.workers.dev', path, headers: { 'User-Agent': 'test' } }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d.slice(0, 200) })); });
    req.on('error', rej);
  });
}
async function main() {
  // Test HTTP
  const r1 = await get('/');
  console.log('HTTP /:', r1.status, r1.body.slice(0, 80));
  const r2 = await get('/chat');
  console.log('HTTP /chat:', r2.status, r2.body.slice(0, 80));

  // Test WS on workers.dev
  const https2 = require('https');
  const post = (path, body) => new Promise((res, rej) => {
    const b = JSON.stringify(body);
    const opts = { hostname: 'tinychat.yujiangbiao2000.workers.dev', path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } };
    const req = https2.request(opts, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); });
    req.on('error', rej); req.write(b); req.end();
  });

  const u = 'wt' + Date.now();
  const email = `w${Date.now()}@t.com`;
  const r3 = await post('/api/register', { username: u, password: 'test1234', email });
  console.log('Reg:', r3.ok, r3.token?.slice(0, 30));
  if (!r3.ok) return;

  const wsUrl = `wss://tinychat.yujiangbiao2000.workers.dev/chat?token=${encodeURIComponent(r3.token)}`;
  console.log('WS URL:', wsUrl.slice(0, 80));
  const ws = new WebSocket(wsUrl);
  ws.on('open', () => console.log('WS open OK'));
  ws.on('message', d => console.log('WS msg:', d.toString().slice(0, 100)));
  ws.on('error', e => console.log('WS error:', e.message));
  ws.on('close', (c, r) => console.log('WS close:', c, r?.toString()));
  setTimeout(() => { console.log('timeout'); process.exit(0); }, 8000);
}
main().catch(console.error);
