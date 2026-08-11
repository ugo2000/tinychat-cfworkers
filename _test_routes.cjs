const https = require('https');
function get(path) {
  return new Promise((res, rej) => {
    const req = https.get({ hostname: 'chathub.asia', path, headers: { 'User-Agent': 'test' } }, s => {
      let d = ''; s.on('data', c => d += c);
      s.on('end', () => res({ status: s.statusCode, body: d.slice(0, 300) }));
    });
    req.on('error', rej);
  });
}
async function main() {
  // Test routes that ONLY exist in tinychat Worker
  const routes = ['/test', '/about', '/pricing', '/admin', '/api/version'];
  for (const r of routes) {
    try {
      const resp = await get(r);
      console.log(r, '->', resp.status, resp.body.slice(0, 80));
    } catch (e) {
      console.log(r, '-> ERROR:', e.message);
    }
  }
  // Test /chat with token to see if it tries WS upgrade
  console.log('\n--- /chat token test ---');
  // Register a user first
  const u = 'u' + Date.now();
  const reg = await post('/api/register', { username: u, password: 'pass1234', email: u + '@x.com' });
  console.log('Register:', reg.status, reg.body.slice(0, 100));
}
function post(path, body) {
  return new Promise((res, rej) => {
    const b = JSON.stringify(body);
    const req = https.request({ hostname: 'chathub.asia', path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, s => {
      let d = ''; s.on('data', c => d += c); s.on('end', () => res({ status: s.statusCode, body: d }));
    });
    req.on('error', rej); req.write(b); req.end();
  });
}
main().catch(console.error);
