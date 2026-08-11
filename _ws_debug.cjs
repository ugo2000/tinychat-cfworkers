const https = require('https');
const { WebSocket } = require('ws');
function post(path, body) {
  return new Promise((res, rej) => {
    const b = JSON.stringify(body);
    const opts = { hostname: 'chathub.asia', path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } };
    const req = https.request(opts, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: JSON.parse(d) })); });
    req.on('error', rej); req.write(b); req.end();
  });
}
async function main() {
  const u = 'dbg' + Date.now();
  const r1 = await post('/api/register', { username: u, password: 'test1234', email: `${u}@test.com` });
  console.log('Reg:', r1.body.ok);
  const r2 = await post('/api/login', { username: u, password: 'test1234' });
  console.log('Login:', r2.body.ok, 'token len:', r2.body.token?.length);
  const tok = r2.body.token;
  console.log('Token head:', tok?.slice(0, 50));

  // Try workers.dev too
  const opts2 = { hostname: 'chathub.asia', path: '/chat?token=' + encodeURIComponent(tok), method: 'GET' };
  const req2 = https.request(opts2, r => { console.log('HTTP resp status:', r.statusCode); r.resume(); });
  req2.on('error', e => console.log('HTTP error:', e.message));
  req2.end();

  // Try WS without encoding
  const wsUrl = `wss://chathub.asia/chat?token=${tok}`;
  console.log('\nWS URL (truncated):', wsUrl.slice(0, 80) + '...');
  const ws = new WebSocket(wsUrl);
  ws.on('open', () => console.log('WS open OK'));
  ws.on('message', d => console.log('WS msg:', d.toString().slice(0, 100)));
  ws.on('error', e => console.log('WS error:', e.message));
  ws.on('close', (code, reason) => console.log('WS close:', code, reason?.toString()));
  setTimeout(() => process.exit(0), 5000);
}
main().catch(console.error);
