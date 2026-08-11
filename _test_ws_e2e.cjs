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

async function main() {
  // User A
  const u1base = 'userA' + Date.now();
  await req('POST', '/api/register', { username: u1base, password: 'pass1234', email: u1base + '@x.com' });
  const login1 = (await req('POST', '/api/login', { username: u1base, password: 'pass1234' })).body;
  const userA = login1.username;
  console.log('UserA:', userA);

  // User B
  const u2base = 'userB' + Date.now();
  await req('POST', '/api/register', { username: u2base, password: 'pass1234', email: u2base + '@x.com' });
  const login2 = (await req('POST', '/api/login', { username: u2base, password: 'pass1234' })).body;
  const userB = login2.username;
  console.log('UserB:', userB);

  const token1 = login1.token;
  const token2 = login2.token;

  // Connect both
  const ws1 = new WebSocket('wss://chathub.asia/chat', { headers: { 'Authorization': 'Bearer ' + token1 } });
  const ws2 = new WebSocket('wss://chathub.asia/chat', { headers: { 'Authorization': 'Bearer ' + token2 } });

  let init1 = false, init2 = false, online1 = false, online2 = false, msg1to2 = false, msg2to1 = false;

  ws1.on('open', () => console.log('WS1 OPEN'));
  ws2.on('open', () => console.log('WS2 OPEN'));

  ws1.on('message', data => {
    const m = JSON.parse(data.toString());
    console.log('WS1:', m.type, m.username || '', m.from || '', m.text || '');
    if (m.type === 'init') { init1 = true; console.log('  -> init1 OK'); }
    if (m.type === 'online') { online1 = true; console.log('  -> online1 OK, user:', m.username); }
    if (m.type === 'message' && m.from === userB) { msg2to1 = true; console.log('  -> msg2to1 OK'); }
  });

  ws2.on('message', data => {
    const m = JSON.parse(data.toString());
    console.log('WS2:', m.type, m.username || '', m.from || '', m.text || '');
    if (m.type === 'init') { init2 = true; console.log('  -> init2 OK'); }
    if (m.type === 'online') { online2 = true; console.log('  -> online2 OK, user:', m.username); }
    if (m.type === 'message' && m.from === userA) { msg1to2 = true; console.log('  -> msg1to2 OK'); }
  });

  // Wait for connections
  await new Promise(r => setTimeout(r, 2000));

  console.log('\nSending messages...');
  ws1.send(JSON.stringify({ type: 'message', text: 'Hello from A!' }));
  ws2.send(JSON.stringify({ type: 'message', text: 'Hi from B!' }));

  await new Promise(r => setTimeout(r, 3000));

  console.log('\n--- Results ---');
  const all = init1 && init2 && online1 && online2 && msg2to1 && msg1to2;
  console.log('init1:', init1 ? 'PASS' : 'FAIL');
  console.log('init2:', init2 ? 'PASS' : 'FAIL');
  console.log('online (A sees B online):', online1 ? 'PASS' : 'FAIL');
  console.log('online (B sees A online):', online2 ? 'PASS' : 'FAIL');
  console.log('A received B msg:', msg2to1 ? 'PASS' : 'FAIL');
  console.log('B received A msg:', msg1to2 ? 'PASS' : 'FAIL');
  console.log(all ? '\nALL TESTS PASS!' : '\nSOME TESTS FAILED');

  ws1.close(); ws2.close();
  process.exit(all ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
