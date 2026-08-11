// Two-user live WS e2e: real-world scenario
// Usage: node _e2e_two.mjs <token1> <user1> <token2> <user2>
import WebSocket from 'ws';

const [t1, u1, t2, u2] = process.argv.slice(2);
if (!t1 || !t2) { console.log('usage: node _e2e_two.mjs <token1> <user1> <token2> <user2>'); process.exit(1); }
const HOST = 'wss://chathub.asia';
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
}
function connect(label, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(HOST + '/chat?token=' + encodeURIComponent(token), { handshakeTimeout: 10000 });
    const state = { ws, label, opened: false, msgs: [] };
    ws.on('open', () => { state.opened = true; resolve(state); });
    ws.on('message', (data) => { try { state.msgs.push(JSON.parse(data.toString())); } catch (e) {} });
    ws.on('error', (e) => { if (!state.opened) reject(e); });
    setTimeout(() => { if (!state.opened) reject(new Error('timeout ' + label)); }, 15000);
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function waitFor(cond, timeoutMs, what) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (cond()) { clearInterval(iv); resolve(true); }
      else if (Date.now() - t0 > timeoutMs) { clearInterval(iv); reject(new Error('timeout: ' + what)); }
    }, 100);
  });
}
// frontend derivation rule (the actual product logic):
const dir = (msg, myUser) => (msg.from || msg.username) === myUser ? 'outgoing' : 'incoming';

const A = await connect('A', t1);
const B = await connect('B', t2);
check('user1 open', true);
check('user2 open', true);

// u1 sends public message → u2 must receive as incoming; u1 echo as outgoing
const text = 'pub-' + Date.now();
A.ws.send(JSON.stringify({ type: 'message', text }));
let aGot = null, bGot = null;
try {
  await waitFor(() => {
    aGot = A.msgs.find(m => m.type === 'message' && m.text === text);
    bGot = B.msgs.find(m => m.type === 'message' && m.text === text);
    return aGot && bGot;
  }, 10000, 'public broadcast');
  check('u2 receives public msg', true);
  check('u1 echo receives public msg', true);
  check('u2 renders incoming', dir(bGot, u2) === 'incoming', `derived=${dir(bGot, u2)} sender=${bGot.username}`);
  check('u1 renders outgoing', dir(aGot, u1) === 'outgoing', `derived=${dir(aGot, u1)} sender=${aGot.username}`);
} catch (e) {
  check('u2 receives public msg', !!bGot, e.message);
  check('u1 echo receives public msg', !!aGot);
}

// DM u1 -> u2: u2 incoming, u1 outgoing echo
const dmText = 'dm-' + Date.now();
A.ws.send(JSON.stringify({ type: 'private', to: u2, text: dmText }));
let aDm = null, bDm = null;
try {
  await waitFor(() => {
    aDm = A.msgs.find(m => m.type === 'private' && m.text === dmText);
    bDm = B.msgs.find(m => m.type === 'private' && m.text === dmText);
    return aDm && bDm;
  }, 10000, 'DM both sides');
  check('u2 receives DM', true, 'serverDirection=' + bDm.direction);
  check('u1 DM echo', true, 'serverDirection=' + aDm.direction);
  check('u2 DM renders incoming', dir(bDm, u2) === 'incoming');
  check('u1 DM renders outgoing', dir(aDm, u1) === 'outgoing');
} catch (e) {
  check('u2 receives DM', !!bDm, e.message);
  check('u1 DM echo', !!aDm);
}

// u2 sends public → u1 receives (reverse direction)
const text2 = 'pub2-' + Date.now();
B.ws.send(JSON.stringify({ type: 'message', text: text2 }));
try {
  await waitFor(() => A.msgs.some(m => m.type === 'message' && m.text === text2), 10000, 'reverse broadcast');
  check('reverse broadcast u2->u1', true);
  const m = A.msgs.find(m => m.type === 'message' && m.text === text2);
  check('u1 renders incoming for u2 msg', dir(m, u1) === 'incoming', `sender=${m.username}`);
} catch (e) { check('reverse broadcast u2->u1', false, e.message); }

A.ws.close(); B.ws.close();
await sleep(500);
const fails = results.filter(r => !r.ok);
console.log(fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILED');
process.exit(fails.length === 0 ? 0 : 1);
