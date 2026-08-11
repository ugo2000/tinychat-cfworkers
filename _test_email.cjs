const https = require('https');
const { WebSocket } = require('ws');
const BASE = 'https://chathub.asia';
let USERS = [];
let TOKENS = [];

function post(path, body) {
  return new Promise((res, rej) => {
    const b = JSON.stringify(body);
    const opts = { hostname: 'chathub.asia', path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } };
    const req = https.request(opts, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: JSON.parse(d) })); });
    req.on('error', rej); req.write(b); req.end();
  });
}

async function main() {
  const a = 'em_a' + Date.now();
  const b = 'em_b' + Date.now();
  const email = `test${Date.now()}@test.com`;

  // 1. Register with email
  const r1 = await post('/api/register', { username: a, password: 'test1234', email });
  console.log('1. Register:', r1.status === 200 ? 'PASS' : 'FAIL', JSON.stringify(r1.body));
  if (!r1.body.ok) return;

  // 2. Register duplicate email
  const r2 = await post('/api/register', { username: b, password: 'test1234', email });
  console.log('2. Dup email:', r2.status === 409 ? 'PASS' : 'FAIL', JSON.stringify(r2.body));

  // 3. Register no email
  const r3 = await post('/api/register', { username: 'noemail' + Date.now(), password: 'test1234' });
  console.log('3. No email:', r3.status === 400 ? 'PASS' : 'FAIL', JSON.stringify(r3.body));

  // 4. Login with email
  const r4 = await post('/api/login', { username: email, password: 'test1234' });
  console.log('4. Login email:', r4.status === 200 ? 'PASS' : 'FAIL', JSON.stringify(r4.body));
  if (!r4.body.ok) return;
  TOKENS.push(r4.body.token);
  USERS.push(a);

  // 5. Login with username
  const r5 = await post('/api/login', { username: a, password: 'test1234' });
  console.log('5. Login user:', r5.status === 200 ? 'PASS' : 'FAIL', JSON.stringify(r5.body));

  // 6. Quota via token
  const r6 = await post('/api/quota', { token: r4.body.token });
  console.log('6. Quota:', r6.body.ok ? 'PASS' : 'FAIL', JSON.stringify(r6.body));

  console.log('\n=== DONE ===');
}

main().catch(console.error);
