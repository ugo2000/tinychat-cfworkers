// E2E test for ugochat production (chathub.asia)
// Tests: register, login, users, messages, buy, pay-config, WS chat + private
import WebSocket from 'ws';

const BASE = 'https://chathub.asia';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name, extra); }
  else { fail++; console.log('FAIL', name, extra); }
}
const rnd = Date.now().toString(36).slice(-6);
const userA = 't_a' + rnd, userB = 't_b' + rnd;
const pwd = 'pass1234';

async function api(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

// 1. Register two users
let r = await api('/api/register', { username: userA, password: pwd });
ok('register A', r.status === 200 && r.data && r.data.ok === true, JSON.stringify(r.data));
r = await api('/api/register', { username: userB, password: pwd });
ok('register B', r.status === 200 && r.data && r.data.ok === true, JSON.stringify(r.data));

// 2. Login
r = await api('/api/login', { username: userA, password: pwd });
ok('login A', r.status === 200 && r.data && r.data.token, JSON.stringify(r.data && r.data.token ? 'token ok' : r.data));
const tokenA = r.data.token;
r = await api('/api/login', { username: userB, password: pwd });
ok('login B', r.status === 200 && r.data && r.data.token);
const tokenB = r.data.token;

// 3. Users list
r = await api('/api/users', { token: tokenA });
ok('users list', r.status === 200, JSON.stringify(r.data));

// 4. Messages list
const res = await fetch(BASE + '/api/messages');
const msgs = await res.json();
ok('messages API', res.status === 200 && Array.isArray(msgs));

// 5. Buy (mock path - no wechat configured, expect mock:true quota -1)
r = await api('/api/buy', { token: tokenA, pkg: 'once' });
ok('buy once', r.status === 200, JSON.stringify(r.data));

// 6. Pay config
const res2 = await fetch(BASE + '/api/pay-config');
const cfg = await res2.json();
ok('pay-config', res2.status === 200 && typeof cfg === 'object', JSON.stringify(cfg).substring(0, 200));

// 7. Quota
r = await api('/api/quota', { token: tokenA });
ok('quota', r.status === 200, JSON.stringify(r.data));

// 8. WebSocket: A connects, sends message, B connects receives it
function wsConnect(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(BASE + '/chat?token=' + encodeURIComponent(token));
    const ctx = { ws, inbox: [], opened: false };
    ws.on('open', () => { ctx.opened = true; resolve(ctx); });
    ws.on('message', (d) => { try { ctx.inbox.push(JSON.parse(d.toString())); } catch (e) {} });
    ws.on('error', (e) => { if (!ctx.opened) reject(e); });
    setTimeout(() => { if (!ctx.opened) reject(new Error('open timeout')); }, 10000);
  });
}

let wsA, wsB;
try {
  wsA = await wsConnect(tokenA);
  ok('WS A open', wsA.opened);
} catch (e) { ok('WS A open', false, e.message); }
try {
  wsB = await wsConnect(tokenB);
  ok('WS B open', wsB.opened);
} catch (e) { ok('WS B open', false, e.message); }

if (wsA && wsB) {
  await sleep(1500);
  // A got init with onlineUsers
  const initA = wsA.inbox.find(m => m.type === 'init');
  ok('A init', !!initA, initA ? 'online=' + (initA.onlineUsers || []).length : 'no init');
  // A sends group message
  wsA.ws.send(JSON.stringify({ type: 'message', text: 'hello from e2e ' + rnd }));
  await sleep(1500);
  const gotB = wsB.inbox.find(m => m.type === 'message' && m.text === 'hello from e2e ' + rnd);
  ok('B received group msg', !!gotB, gotB ? 'from ' + gotB.username + ' geo=' + (gotB.geo || '') : 'not received');
  // B private to A
  wsB.ws.send(JSON.stringify({ type: 'private', to: userA, text: 'private hi ' + rnd }));
  await sleep(1500);
  const gotA = wsA.inbox.find(m => m.type === 'private' && m.text === 'private hi ' + rnd);
  ok('A received private msg', !!gotA, gotA ? 'direction=' + gotA.direction : 'not received');
  wsA.ws.close(); wsB.ws.close();
} else {
  console.log('SKIP WS message tests (connection failed)');
}

console.log('\n==== RESULT: ' + pass + ' pass, ' + fail + ' fail ====');
process.exit(fail > 0 ? 1 : 0);
