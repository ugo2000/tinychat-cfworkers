const https = require('https');
function get(path, headers = {}) {
  return new Promise((res, rej) => {
    const req = https.get({ hostname: 'chathub.asia', path, headers: { ...headers, 'User-Agent': 'test' } }, s => {
      let d = ''; s.on('data', c => d += c);
      s.on('end', () => res({ status: s.statusCode, headers: s.headers, body: d.slice(0, 300) }));
    });
    req.on('error', rej);
  });
}
async function main() {
  console.log('=== GET / ===');
  const r1 = await get('/');
  console.log('Status:', r1.status);
  console.log('Headers:', JSON.stringify(r1.headers, null, 2));
  console.log('Body:', r1.body.slice(0, 100));

  console.log('\n=== GET /chat ===');
  const r2 = await get('/chat');
  console.log('Status:', r2.status);
  console.log('Headers:', JSON.stringify(r2.headers, null, 2));
  console.log('Body:', r2.body.slice(0, 100));

  console.log('\n=== GET /api/version ===');
  const r3 = await get('/api/version');
  console.log('Status:', r3.status, 'Body:', r3.body.slice(0, 100));
}
main().catch(console.error);
