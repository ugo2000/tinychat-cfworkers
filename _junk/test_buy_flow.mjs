const base = 'https://chathub.asia';
const cb = Date.now();

// Register
const r1 = await fetch(`${base}/api/register?cb=${cb}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'testbuy_' + cb, password: 'test1234' })
});
const d1 = await r1.json();
console.log('register:', JSON.stringify(d1));

// Login
const r2 = await fetch(`${base}/api/login?cb=${cb}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: d1.username || 'testbuy_' + cb, password: 'test1234' })
});
const d2 = await r2.json();
console.log('login:', JSON.stringify(d2));

if (!d2.token) { console.log('NO TOKEN'); process.exit(1); }

// Buy
const r3 = await fetch(`${base}/api/buy?cb=${cb}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: d2.token, pkg: 'once' })
});
const d3 = await r3.json();
console.log('buy:', JSON.stringify(d3));
console.log('personal:', d3.personal);
console.log('alipayUrl present:', !!(d3.alipayUrl));
console.log('paidBtn should show:', d3.personal);
