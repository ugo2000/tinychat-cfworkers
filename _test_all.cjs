const https = require('https');
const { WebSocket } = require('ws');

function req(method, path, body, headers = {}) {
  return new Promise((res, rej) => {
    const b = body ? JSON.stringify(body) : null;
    const h = { 'User-Agent': 'test', ...headers };
    if (b) { h['Content-Type'] = 'application/json'; h['Content-Length'] = Buffer.byteLength(b); }
    const opts = { hostname: 'chathub.asia', path, method, headers: h };
    const r = https.request(opts, s => {
      let d = '';
      s.on('data', c => d += c);
      s.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(d); } catch {}
        res({ status: s.statusCode, body: d, parsed });
      });
    });
    r.on('error', rej);
    if (b) r.write(b);
    r.end();
  });
}

async function main() {
  // Test HTTP /chat directly
  const r1 = await req('GET', '/chat');
  console.log('1. GET /chat:', r1.status, r1.body.slice(0, 150));

  // Register a user
  const u = 't' + Date.now();
  const r2 = await req('POST', '/api/register', { username: u, password: 'test1234', email: `${u}@t.com` });
  console.log('2. Register:', r2.parsed?.ok, r2.parsed?.error);
  if (!r2.parsed?.ok) return;
  const tok = r2.parsed.token;

  // Now try HTTP /chat with token
  const r3 = await req('GET', '/chat?token=' + encodeURIComponent(tok));
  console.log('3. GET /chat?token:', r3.status, r3.body.slice(0, 150));

  // Try WS
  const wsUrl = `wss://chathub.asia/chat?token=${encodeURIComponent(tok)}`;
  console.log('4. WS URL len:', wsUrl.length);
  const ws = new WebSocket(wsUrl);
  let timer;
  ws.on('open', () => { console.log('4. WS OPEN OK'); clearTimeout(timer); ws.close(); process.exit(0); });
  ws.on('error', e => { console.log('4. WS ERROR:', e.message); clearTimeout(timer); process.exit(1); });
  ws.on('close', (c, r) => { console.log('4. WS CLOSE:', c, r?.toString()); process.exit(1); });
  timer = setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
}
main().catch(console.error);
