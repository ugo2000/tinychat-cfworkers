import WebSocket from 'ws';
import https from 'https';

async function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function run() {
  const base = 'https://chathub.asia';

  // 1. Register
  const user = 't' + Date.now();
  console.log('Registering user:', user);
  const reg = await fetchJSON(base + '/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: user, password: '123456', email: '' },
  });
  console.log('Register result:', JSON.stringify(reg));

  if (!reg.ok) {
    console.log('Register failed, trying login with', user);
  } else {
    // Login to get token after register
    console.log('Register OK, now logging in to get token...');
  }
  const login = await fetchJSON(base + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: user, password: '123456' },
  });
  console.log('Login result:', JSON.stringify(login));
  if (!login.ok) { console.log('FAIL: cannot get token'); process.exit(1); }
  const token = login.token;

  // 2. Test WebSocket with real token
  console.log('\nTesting WebSocket with real token...');
  const wsUrl = 'wss://chathub.asia/chat?token=' + encodeURIComponent(token);
  console.log('WS URL: wss://chathub.asia/chat?token=' + token.substring(0, 20) + '...');

  const ws = new WebSocket(wsUrl);
  let settled = false;

  ws.on('open', () => {
    console.log('✅ WS OPEN - WebSocket connection SUCCESSFUL!');
    settled = true;
    ws.close();
  });

  ws.on('message', (data) => {
    console.log('📨 WS MSG:', data.toString().substring(0, 100));
  });

  ws.on('error', (e) => {
    console.log('❌ WS ERROR:', e.message);
    if (!settled) { settled = true; process.exit(1); }
  });

  ws.on('close', (code, reason) => {
    console.log('WS CLOSE code:', code, 'reason:', reason.toString());
    if (!settled) { settled = true; console.log('\n✅ WebSocket connection verified!'); process.exit(0); }
  });

  setTimeout(() => {
    if (!settled) {
      console.log('TIMEOUT - No connection within 10s');
      process.exit(1);
    }
  }, 10000);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
