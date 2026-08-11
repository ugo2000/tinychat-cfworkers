const https = require('https');
const WebSocket = require('ws');

function req(method, path, body) {
  return new Promise((res, rej) => {
    const b = JSON.stringify(body || {});
    const opts = { hostname: 'chathub.asia', path, method, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } };
    const r = https.request(opts, s => {
      let d = ''; s.on('data', c => d += c);
      s.on('end', () => { try { res({ status: s.statusCode, body: JSON.parse(d) }); } catch (e) { res({ status: s.statusCode, body: d }); } });
    });
    r.on('error', rej); r.write(b); r.end();
  });
}

function wsConnect(token) {
  return new Promise((res, rej) => {
    const ws = new WebSocket('wss://chathub.asia/chat', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const timer = setTimeout(() => { ws.terminate(); res({ type: 'TIMEOUT' }); }, 8000);
    ws.on('open', () => res({ ws, type: 'OPEN', timer }));
    ws.on('message', data => res({ ws, type: 'MSG', data: JSON.parse(data.toString()), timer }));
    ws.on('error', e => { clearTimeout(timer); res({ type: 'ERROR', error: e.message }); });
    ws.on('close', (code, reason) => { clearTimeout(timer); res({ type: 'CLOSE', code, reason: reason.toString() }); });
  });
}

async function main() {
  const u = 'wstest' + Date.now();
  const r1 = await req('POST', '/api/register', { username: u, password: 'pass1234', email: u + '@x.com' });
  console.log('Register:', r1.body.ok ? 'OK' : 'FAIL', r1.body);

  const r2 = await req('POST', '/api/login', { username: u, password: 'pass1234' });
  console.log('Login:', r2.body.ok ? 'OK' : 'FAIL', r2.body);

  if (!r2.body.token) { console.log('No token, abort'); return; }
  const token = r2.body.token;
  console.log('Token:', token.slice(0, 30) + '...');

  console.log('\n--- WebSocket test ---');
  const result = await wsConnect(token);
  console.log('WS result type:', result.type);
  if (result.ws) {
    console.log('WS connected! Sending message...');
    result.ws.send(JSON.stringify({ type: 'message', text: 'Hello from test!' }));
    // Wait for more messages
    setTimeout(() => {
      if (result.ws.readyState === 1) result.ws.close();
    }, 3000);
  } else {
    console.log('WS failed:', result);
  }
}

main().catch(console.error);
