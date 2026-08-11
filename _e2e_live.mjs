// Live WS end-to-end test against chathub.asia (v2 semantics: server echoes to ALL sockets)
// Usage: node _e2e_live.mjs <token> <username>
import WebSocket from 'ws';

const token = process.argv[2];
const user = process.argv[3];
if (!token || !user) { console.log('usage: node _e2e_live.mjs <token> <username>'); process.exit(1); }

const HOST = 'wss://chathub.asia';
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
}
function connect(label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(HOST + '/chat?token=' + encodeURIComponent(token), { handshakeTimeout: 10000 });
    const state = { ws, label, opened: false, msgs: [] };
    ws.on('open', () => { state.opened = true; resolve(state); });
    ws.on('message', (data) => {
      try { state.msgs.push(JSON.parse(data.toString())); } catch (e) { state.msgs.push({ raw: data.toString() }); }
    });
    ws.on('error', (e) => { if (!state.opened) reject(e); });
    setTimeout(() => { if (!state.opened) reject(new Error('timeout opening ' + label)); }, 15000);
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function waitFor(cond, timeoutMs, what) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (cond()) { clearInterval(iv); resolve(true); }
      else if (Date.now() - t0 > timeoutMs) { clearInterval(iv); reject(new Error('timeout waiting for ' + what)); }
    }, 100);
  });
}

const A = await connect('A');
check('A open (token-in-URL)', true);
const B = await connect('B');
check('B open (token-in-URL)', true);

try {
  await waitFor(() => A.msgs.some(m => m.type === 'init'), 8000, 'A init');
  check('A init received', true);
} catch (e) { check('A init received', false, e.message); }
try {
  await waitFor(() => B.msgs.some(m => m.type === 'init'), 8000, 'B init');
  check('B init received', true);
} catch (e) { check('B init received', false, e.message); }

// --- Public message: A sends; BOTH A (echo, outgoing) and B (incoming) must receive ---
const text = 'e2e-' + Date.now();
A.ws.send(JSON.stringify({ type: 'message', text }));
let aGot = null, bGot = null;
try {
  await waitFor(() => {
    aGot = A.msgs.find(m => m.type === 'message' && m.text === text);
    bGot = B.msgs.find(m => m.type === 'message' && m.text === text);
    return aGot && bGot;
  }, 10000, 'broadcast to A(echo)+B');
  check('broadcast reaches B', true);
  check('broadcast echoes to sender A', true, 'direction=' + aGot.direction + ' username=' + aGot.username);
  check('B msg direction=incoming', bGot.direction === 'incoming', 'direction=' + bGot.direction);
  check('A msg direction=outgoing', aGot.direction === 'outgoing', 'direction=' + aGot.direction);
} catch (e) {
  check('broadcast reaches B', !!bGot, bGot ? '' : 'B did not get it');
  check('broadcast echoes to sender A', !!aGot, aGot ? '' : 'A did not get echo');
}

// --- DM: A -> B (same user, two sockets). B gets incoming, A gets outgoing echo ---
const dmText = 'dm-' + Date.now();
A.ws.send(JSON.stringify({ type: 'private', to: user, text: dmText }));
let aDm = null, bDm = null;
try {
  await waitFor(() => {
    aDm = A.msgs.find(m => m.type === 'private' && m.text === dmText);
    bDm = B.msgs.find(m => m.type === 'private' && m.text === dmText);
    return aDm && bDm;
  }, 10000, 'DM to both sides');
  check('DM reaches recipient B', true, 'direction=' + bDm.direction);
  check('DM echoes to sender A', true, 'direction=' + aDm.direction);
  check('DM B direction=incoming', bDm.direction === 'incoming');
  check('DM A direction=outgoing', aDm.direction === 'outgoing');
} catch (e) {
  check('DM reaches recipient B', !!bDm);
  check('DM echoes to sender A', !!aDm);
}

A.ws.close(); B.ws.close();
await sleep(500);
const fails = results.filter(r => !r.ok);
console.log(fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILED');
process.exit(fails.length === 0 ? 0 : 1);
