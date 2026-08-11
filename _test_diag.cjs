const https = require('https');
function get(path) {
  return new Promise((res, rej) => {
    const req = https.get({ hostname: 'chathub.asia', path, headers: { 'User-Agent': 'diag' } }, s => {
      let d = ''; s.on('data', c => d += c);
      s.on('end', () => res({ status: s.statusCode, body: d }));
    });
    req.on('error', rej);
  });
}
async function main() {
  console.log('=== chathub.asia/chat ===');
  const r = await get('/chat');
  console.log('Status:', r.status);
  console.log('Body:', r.body);
  console.log('\n=== workers.dev/chat ===');
  const r2 = await get('/chat'.replace('chathub.asia', 'tinychat.yujiangbiao2000.workers.dev'));
  // Can't use workers.dev directly - it times out. Use workers.dev URL directly
  const r3 = await new Promise((res, rej) => {
    const req = https.get({ hostname: 'tinychat.yujiangbiao2000.workers.dev', path: '/chat', headers: { 'User-Agent': 'diag' } }, s => {
      let d = ''; s.on('data', c => d += c);
      s.on('end', () => res({ status: s.statusCode, body: d }));
    });
    req.on('error', e => res({ status: -1, body: e.message }));
  });
  console.log('Status:', r3.status);
  console.log('Body:', r3.body.slice(0, 200));
}
main().catch(console.error);
