const u = 'wsdebug_' + Math.random().toString(36).slice(2,8);
const p = 'test1234';

async function main() {
  const r1 = await fetch('https://chathub.asia/api/register', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username: u, password: p})
  });
  console.log('Register:', r1.status, await r1.text());

  const r2 = await fetch('https://chathub.asia/api/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username: u, password: p})
  });
  const d = await r2.json();
  console.log('Login:', JSON.stringify(d));

  const token = d.token;
  const wsUrl = 'wss://chathub.asia/chat?token=' + token;
  console.log('WS URL:', wsUrl);

  const ws = new WebSocket(wsUrl);
  ws.addEventListener('open', () => console.log('WS OPEN'));
  ws.addEventListener('message', e => {
    console.log('WS MSG:', e.data.substring(0,300));
    ws.close(1000, 'done');
  });
  ws.addEventListener('close', e => {
    console.log('WS CLOSE code=' + e.code + ' reason="' + e.reason + '"');
    process.exit(0);
  });
  ws.addEventListener('error', e => console.log('WS ERROR'));
  setTimeout(() => { console.log('TIMEOUT 10s'); process.exit(1); }, 10000);
}

main().catch(e => console.log('ERR:', e.message));
