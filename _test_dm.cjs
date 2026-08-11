const https = require('https');
function post(path, body, token) {
  return new Promise((res, rej) => {
    const b = JSON.stringify(body);
    const h = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) };
    if (token) h['Authorization'] = 'Bearer ' + token;
    const req = https.request({ hostname: 'chathub.asia', path, method: 'POST', headers: h }, s => {
      let d = ''; s.on('data', c => d += c); s.on('end', () => res({ status: s.statusCode, body: d }));
    });
    req.on('error', rej); req.write(b); req.end();
  });
}
async function main() {
  // Try a known user from global12 if any - use a fresh one
  const u = 'z' + Date.now();
  const r = await post('/api/register', { username: u, password: 'pass1234', email: u + '@x.com' });
  console.log('Register:', r.status, r.body.slice(0, 200));
  if (!r.body.includes('"ok":true')) return;
  const d = JSON.parse(r.body);
  const tok = d.token;
  
  // Test /api/messages
  const r2 = await post('/api/messages', {}, tok);
  console.log('Messages API:', r2.status, r2.body.slice(0, 100));
  
  // Try WS via HTTP Upgrade
  console.log('Token:', tok.slice(0, 20), 'len:', tok.length);
}
main().catch(console.error);
