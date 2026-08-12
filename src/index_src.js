// ugochat - Cloudflare Workers + Durable Objects
import HTML, { ADMIN_HTML, TEST_HTML, ABOUT_HTML, PRICING_HTML } from './html.js';
import { isConfigured as wxConfigured, buildCtx as wxCtx, wechatUnifiedOrder as wxOrder, decryptResource as wxDecrypt, verifyNotify as wxVerify } from './wechat.js';

const BAD_WORDS = ['fuck','shit','ass','bitch','damn','crap','dick','piss',
  'slut','whore','nigger','fag','asshole','bastard','cock','cunt',
  'fuckyou','fck','wtf','stfu','cao','sb'];

const APP_VERSION = '20260812-1545';

const SECRET = new TextEncoder().encode('tinychat-hmac-secret-2026');

// ?Cloudflare secret ADMIN_PASSWORD wrangler secret put ADMIN_PASSWORD?//  `wrangler secret put ADMIN_PASSWORD` 
// ===================== Worker  =====================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/version') {
      return new Response(JSON.stringify({ version: APP_VERSION }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    if (path === '/api/pay-config') {
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(request);
    }

    if (path === '/api/pay-qr') {
      const pwd = url.searchParams.get('pwd') || '';
      if (pwd !== (env.ADMIN_PASSWORD || '')) return json({ error: 'unauthorized' }, 401);
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(request);
    }

    if (path === '/api/register' || path === '/api/login' ||
        path === '/api/users' || path === '/api/messages' ||
        path === '/api/quota' || path === '/api/buy' || path === '/api/pay-confirm') {
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(request);
    }

    if (path === '/chat') {
      const stub = env.CHAT.idFromName('global12');
      const city = (request.cf && request.cf.city) || '';
      const country = (request.cf && request.cf.country) || '';
      // Build headers: preserve ALL original headers (especially Upgrade: websocket)
      const newHeaders = new Headers(request.headers);
      newHeaders.set('X-CF-City', city);
      newHeaders.set('X-CF-Country', country);
      // Use original URL so DO gets correct pathname
      const newReq = new Request(request.url, {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        duplex: 'half'
      });
      return env.CHAT.get(stub).fetch(newReq);
    }

    if (path === '/wechat/notify') {
      return await handleWechatNotify(request, env);
    }

    if (path === '/api/wxpay/status') {
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(request);
    }

    if (path === '/track') {
      const cf = request.cf || {};
      const ip = cf.ip || request.headers.get('CF-Connecting-IP') || request.headers.get('cf-connecting-ip') || '';
      const sp = new URLSearchParams(url.search);
      sp.set('country', cf.country || '');
      sp.set('region', cf.region || '');
      sp.set('city', cf.city || '');
      sp.set('colo', cf.colo || '');
      sp.set('ip', ip);
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(new Request('https://dummy/track?' + sp.toString(), { method: 'GET' }));
    }

    if (path === '/admin/pay-pending') {
      const pwd = url.searchParams.get('pwd') || '';
      if (pwd !== (env.ADMIN_PASSWORD || '')) return json({ error: 'unauthorized' }, 401);
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(request);
    }
    if (path === '/admin/pay-approve') {
      const pwd = url.searchParams.get('pwd') || '';
      if (pwd !== (env.ADMIN_PASSWORD || '')) return json({ error: 'unauthorized' }, 401);
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(request);
    }
    if (path === '/admin/clear-visitors') {
      const pwd = url.searchParams.get('pwd') || '';
      if (pwd !== env.ADMIN_PASSWORD) return json({ error: 'unauthorized' }, 401);
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(new Request('https://dummy/clear-visitors', { method: 'GET' }));
    }

    if (path === '/test') {
      return new Response(TEST_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    if (path === '/pricing') {
      return new Response(PRICING_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    if (path === '/about') {
      return new Response(ABOUT_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    if (path === '/admin') {
      return new Response(ADMIN_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    if (path === '/admin/users') {
      const url = new URL(request.url);
      const pwd = url.searchParams.get('pwd') || '';
      if (pwd !== (env.ADMIN_PASSWORD || '')) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      const stub = env.CHAT.idFromName('global12');
      const res = await env.CHAT.get(stub).fetch(new Request('https://dummy/admin-data', { method: 'GET', headers: request.headers }));
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }

    // SPA routes - all serve the same HTML with JS handling client-side routing
    if (path === '/' || path === '/index.html' || 
        path === '/login' || path === '/register') {
      return new Response(HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

// ===================== Durable Object =====================
export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.randomWait = null;        // username currently waiting for a random peer
    this.randomPeer = {};          // username -> peer username (live 1:1 random pairs)
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    const upgradeHeader = request.headers.get('Upgrade') || '';
    if (upgradeHeader.toLowerCase() === 'websocket') {
      return this.handleWebSocket(request, url);
    }

    try {
      switch (path) {
        case '/api/register': return await this.handleRegister(request);
        case '/api/login':    return await this.handleLogin(request);
        case '/api/users':    return await this.handleUsers();
        case '/api/messages': return await this.handleMessages();
        case '/api/quota':    return await this.handleQuota(request);
        case '/api/buy':      return await this.handleBuy(request);
        case '/api/wxpay':      return await this.handleWxCreateOrder(request);
        case '/api/wxpay/status': return await this.handleWxStatus(request);
        case '/api/pay-config':   return await this.handlePayConfig(request);
        case '/api/pay-confirm':   return await this.handlePayConfirm(request);
        case '/api/pay-qr':       return await this.handlePayQr(request);
        case '/api/pay-pending':  return await this.handlePayPending(request);
        case '/wxmark':        return await this.handleWxMark(url);
        case '/admin-data':       return await this.handleAdminData();
        case '/admin/pay-pending': return await this.handlePayPending(request);
        case '/admin/pay-approve': return await this.handlePayApprove(request);
        case '/track':       return await this.handleTrack(url);
        case '/clear-visitors': return await this.handleClearVisitors();
        default: return json({ error: 'Not found' }, 404);
      }
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  // ----  ----
  async getQuota(username) {
    const users = await this.state.storage.get('users') || {};
    const u = users[username];
    return (u && typeof u.quota === 'number') ? u.quota : 0;
  }
  async setQuota(username, q) {
    const users = await this.state.storage.get('users') || {};
    if (!users[username]) users[username] = { hash: '', createdAt: Date.now() };
    users[username].quota = q;
    await this.state.storage.put('users', users);
  }
  async pushQuota(username) {
    const q = await this.getQuota(username);
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.username === username) {
        try { await ws.send(JSON.stringify({ type: 'quota', quota: q })); } catch(e) {}
      }
    }
  }

  // ---- WebSocket ----
  async handleWebSocket(request, url) {
    // Get token from Authorization header (primary) or query param (fallback)
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (url.searchParams.get('token') || '');
    const payload = await verifyToken(token);
    if (!payload) return new Response('Unauthorized', { status: 401 });
    const username = payload.username;

    const pair = new WebSocketPair();
    const server = pair[1];
    await this.state.acceptWebSocket(server, []);

    const geo = this._getGeo(request);
    server.serializeAttachment({ username, geo });

    const messages = (await this.state.storage.get('messages') || []).slice(-50);
    let onlines = (await this.state.storage.get('onlineUsers') || []);
    if (onlines && typeof onlines === 'object' && !Array.isArray(onlines)) onlines = Object.keys(onlines);
    if (!Array.isArray(onlines)) onlines = [];
    if (!onlines.includes(username)) onlines.push(username);
    await this.state.storage.put('onlineUsers', onlines);

    const safeMsgs = messages.map(m => ({ ...m, geo: m.geo || '' }));
    const wsGeo = {};
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.username) wsGeo[a.username] = a.geo || '';
    }
    const safeOnlines = onlines.map(u => ({ username: u, geo: wsGeo[u] || '' }));

    await server.send(JSON.stringify({ type: 'init', username, onlineUsers: safeOnlines, messages: safeMsgs }));
    await this.broadcastExcept(server, { type: 'online', username, onlineUsers: safeOnlines });

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  webSocketMessage(ws, messageStr) {
    const att = ws.deserializeAttachment();
    const username = att && att.username;
    if (!username) return;

    let msg;
    try { msg = JSON.parse(messageStr); } catch(e) { return; }
    if (!msg || !msg.type) return;

    if (msg.type === 'message') {
      this.handleChatMessage(ws, username, msg.text);
    } else if (msg.type === 'private') {
      this.handlePrivateMessage(username, msg.to, msg.text);
    } else if (msg.type === 'random') {
      this.handleRandomJoin(username);
    } else if (msg.type === 'random_next') {
      this.handleRandomNext(username);
    } else if (msg.type === 'random_leave') {
      this.handleRandomLeave(username);
    } else if (msg.type === 'random_msg') {
      this.handleRandomMessage(username, msg.text);
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    const att = ws.deserializeAttachment();
    const username = att && att.username;
    if (!username) return;

    let onlines = (await this.state.storage.get('onlineUsers') || []);
    if (!Array.isArray(onlines)) onlines = [];
    onlines = onlines.filter(u => u !== username);
    await this.state.storage.put('onlineUsers', onlines);

    // random chat cleanup
    if (this.randomPeer[username]) this._unpair(username, true);
    if (this.randomWait === username) this.randomWait = null;

    await this.broadcast({ type: 'offline', username, onlineUsers: onlines });
  }

  // ----  ----
  async handleChatMessage(senderWs, username, text) {
    if (!text || !text.trim()) return;
    text = filterBadWords(text);

    const quota = await this.getQuota(username);
    if (quota === 0) {
      try { await senderWs.send(JSON.stringify({ type: 'system', code: 'QUOTA_EXHAUSTED', text: 'Free quota used up. Buy or subscribe to continue.' })); } catch(e) {}
      return;
    }
    if (quota > 0) await this.setQuota(username, quota - 1);

    const att = senderWs.deserializeAttachment();
    const geo = (att && att.geo) || '';
    const msg = { type: 'message', username: String(username), text: String(text), timestamp: Date.now(), geo };

    let messages = await this.state.storage.get('messages') || [];
    messages.push(msg);
    if (messages.length > 500) messages = messages.slice(-500);
    await this.state.storage.put('messages', messages);

    // Broadcast to ALL sockets (including sender) so every device/tab of the same
    // account stays in sync; the frontend renders own messages by comparing username.
    await this.broadcast(msg);
    if (quota > 0) { try { await senderWs.send(JSON.stringify({ type: 'quota', quota: quota - 1 })); } catch(e) {} }
    await this._inc('messagesTotal');
  }

  _geoOf(username) {
    // best-effort: from a live attachment cache is not persisted; geo shown live only
    return '';
  }

  async handlePrivateMessage(from, to, text) {
    if (!text || !text.trim() || !to) return;
    text = filterBadWords(text);

    const quota = await this.getQuota(from);
    if (quota === 0) {
      for (const ws of this.state.getWebSockets()) {
        const a = ws.deserializeAttachment();
        if (a && a.username === from) {
          try { await ws.send(JSON.stringify({ type: 'system', code: 'QUOTA_EXHAUSTED', text: 'Free quota used up. Buy or subscribe to continue.' })); } catch(e) {}
        }
      }
      return;
    }
    if (quota > 0) await this.setQuota(from, quota - 1);

    // (to)(from)
    const msg = { type: 'private', from, to, text, timestamp: Date.now() };
    const strIn = JSON.stringify({ ...msg, direction: 'incoming' });
    const strOut = JSON.stringify({ ...msg, direction: 'outgoing' });
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (!a) continue;
      if (a.username === to) { try { await ws.send(strIn); } catch(e) {} }
      else if (a.username === from) { try { await ws.send(strOut); } catch(e) {} }
    }
    try { await this.pushQuota(from); } catch(e) {}
  }

  // ---- Random 1:1 chat (stranger matching) ----
  async handleRandomJoin(username) {
    // already paired? leave old first
    if (this.randomPeer[username]) this._unpair(username, true);
    if (this.randomWait && this.randomWait !== username) {
      const peer = this.randomWait;
      this.randomWait = null;
      this.randomPeer[username] = peer;
      this.randomPeer[peer] = username;
      await this._sendToUser(username, { type: 'random_paired', peer });
      await this._sendToUser(peer, { type: 'random_paired', peer: username });
    } else {
      this.randomWait = username;
      await this._sendToUser(username, { type: 'random_waiting' });
    }
  }

  async handleRandomNext(username) {
    if (this.randomPeer[username]) this._unpair(username, true);
    // re-join queue
    if (this.randomWait && this.randomWait !== username) {
      const peer = this.randomWait;
      this.randomWait = null;
      this.randomPeer[username] = peer;
      this.randomPeer[peer] = username;
      await this._sendToUser(username, { type: 'random_paired', peer });
      await this._sendToUser(peer, { type: 'random_paired', peer: username });
    } else {
      this.randomWait = username;
      await this._sendToUser(username, { type: 'random_waiting' });
    }
  }

  async handleRandomLeave(username) {
    if (this.randomPeer[username]) this._unpair(username, true);
    if (this.randomWait === username) this.randomWait = null;
  }

  async handleRandomMessage(username, text) {
    if (!text || !text.trim()) return;
    const peer = this.randomPeer[username];
    if (!peer) return;
    const quota = await this.getQuota(username);
    if (quota === 0) {
      await this._sendToUser(username, { type: 'system', code: 'QUOTA_EXHAUSTED', text: 'Free quota used up. Subscribe or buy to keep chatting.' });
      return;
    }
    if (quota > 0) await this.setQuota(username, quota - 1);
    const msg = { type: 'random_msg', from: username, text: String(text), timestamp: Date.now() };
    await this._sendToUser(peer, { ...msg, direction: 'incoming' });
    await this._sendToUser(username, { ...msg, direction: 'outgoing' });
    try { await this.pushQuota(username); } catch(e) {}
  }

  _unpair(username, notifyPeer) {
    const peer = this.randomPeer[username];
    if (peer) {
      delete this.randomPeer[peer];
      if (notifyPeer) this._sendToUser(peer, { type: 'random_peer_left' });
    }
    delete this.randomPeer[username];
  }

  async _sendToUser(username, obj) {
    const str = JSON.stringify(obj);
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.username === username) { try { await ws.send(str); } catch(e) {} }
    }
  }

  async broadcast(msg) {
    const str = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      try { await ws.send(str); } catch(e) {}
    }
  }

  async broadcastExcept(excludeWs, msg) {
    const str = JSON.stringify(msg);
    const exA = excludeWs.deserializeAttachment();
    const exUser = exA && exA.username;
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.username === exUser) continue;
      try { await ws.send(str); } catch(e) {}
    }
  }

  _getGeo(request) {
    const city = request.headers.get('X-CF-City') || '';
    const country = request.headers.get('X-CF-Country') || '';
    if (city && country) return city + ', ' + country;
    if (country) return country;
    return '';
  }

  // ---- HTTP API ----
  async handleRegister(request) {
    const body = await request.json();
    const username = (body.username || '').trim();
    const password = body.password || '';
    const email = (body.email || '').trim();

    if (username.length < 2 || password.length < 4) {
      return json({ ok: false, error: 'Username min 2 chars, password min 4 chars' }, 400);
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return json({ ok: false, error: 'Username: letters, digits, underscore only' }, 400);
    }
    // email is optional; if provided, must be valid format
    if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return json({ ok: false, error: 'Invalid email format' }, 400);
    }

    let users = await this.state.storage.get('users') || {};
    if (users[username]) {
      return json({ ok: false, error: 'Username taken' }, 409);
    }
    // uniqueness check by email (only if email provided)
    if (email) {
      for (const u of Object.values(users)) { if (u.email === email) return json({ ok: false, error: 'Email already registered' }, 409); }
    }

    users[username] = { hash: await hashPassword(password), createdAt: Date.now(), quota: 100, email };
    await this.state.storage.put('users', users);
    await this._inc('registersTotal');
    return json({ ok: true });
  }

  async handleLogin(request) {
    await this._inc('loginsTotal');
    const body = await request.json();
    const loginKey = (body.username || '').trim(); // can be username or email
    const password = body.password || '';

    let users = await this.state.storage.get('users') || {};
    let user = users[loginKey]; // try by username
    if (!user) { // try by email
      for (const [uname, u] of Object.entries(users)) { if (u.email === loginKey) { user = u; break; } }
    }
    if (!user || !(await verifyPassword(password, user.hash))) {
      return json({ ok: false, error: 'Wrong username/email or password' }, 401);
    }

    // resolve actual username (in case login was via email)
    let username = loginKey;
    if (!users[username]) { for (const [uname, u] of Object.entries(users)) { if (u.email === loginKey) { username = uname; break; } } }

    const token = await createToken({ username });
    const quota = (user.quota != null) ? user.quota : 100;
    return json({ ok: true, username, token, quota });
  }

  async handleUsers() {
    const users = await this.state.storage.get('users') || {};
    const keys = Object.keys(users);
    return json({ value: keys, Count: keys.length });
  }

  async handleAdminData() {
    const users = await this.state.storage.get('users') || {};
    const onlines = (await this.state.storage.get('onlineUsers') || []);
    const onlineSet = new Set(onlines.map(u => (typeof u === 'object' && u) ? u.username : u));
    const list = Object.keys(users).map(u => {
      const rec = users[u] || {};
      return {
        username: u,
        email: rec.email || '',
        createdAt: rec.createdAt || 0,
        quota: (rec.quota != null) ? rec.quota : 100,
        online: onlineSet.has(u)
      };
    }).sort((a, b) => b.createdAt - a.createdAt);
    const s = await this.state.storage.get('stats') || {};
    const dayKey = new Date().toISOString().slice(0, 10);
    const stats = {
      total: list.length,
      online: list.filter(u => u.online).length,
      withEmail: list.filter(u => u.email).length,
      visits: s.visits || 0,
      todayVisits: (s.visitsByDay && s.visitsByDay[dayKey]) || 0,
      messagesTotal: s.messagesTotal || 0,
      registersTotal: s.registersTotal || 0,
      loginsTotal: s.loginsTotal || 0,
      byCountry: s.byCountry || {},
      byCity: s.byCity || {},
      uniqueIPs: (s.uniqueIPs || []).length
    };
    const visitorLog = await this.state.storage.get('visitorLog') || [];
    return json({ stats, users: list, visitorLog });
  }

  async _inc(key, by) {
    const s = await this.state.storage.get('stats') || {};
    s[key] = (s[key] || 0) + (by || 1);
    await this.state.storage.put('stats', s);
  }

  async handleTrack(url) {
    const page = url.searchParams.get('p') || 'home';
    const country = (url.searchParams.get('country') || '').toUpperCase();
    const region = url.searchParams.get('region') || '';
    const city = url.searchParams.get('city') || '';
    const ip = url.searchParams.get('ip') || '';
    const dayKey = new Date().toISOString().slice(0, 10);
    const s = await this.state.storage.get('stats') || {};
    s.visits = (s.visits || 0) + 1;
    s.visitsByDay = s.visitsByDay || {};
    s.visitsByDay[dayKey] = (s.visitsByDay[dayKey] || 0) + 1;
    s.visitsByPage = s.visitsByPage || {};
    s.visitsByPage[page] = (s.visitsByPage[page] || 0) + 1;
    s.byCountry = s.byCountry || {};
    s.byCity = s.byCity || {};
    if (country) s.byCountry[country] = (s.byCountry[country] || 0) + 1;
    if (city) s.byCity[city] = (s.byCity[city] || 0) + 1;
    if (ip) {
      s.uniqueIPs = s.uniqueIPs || [];
      if (!s.uniqueIPs.includes(ip)) {
        s.uniqueIPs.push(ip);
        if (s.uniqueIPs.length > 5000) s.uniqueIPs = s.uniqueIPs.slice(-5000);
      }
    }
    await this.state.storage.put('stats', s);
    const log = await this.state.storage.get('visitorLog') || [];
    log.unshift({ ip, country, city, region, ts: Date.now() });
    if (log.length > 200) log.length = 200;
    await this.state.storage.put('visitorLog', log);
    // 1x1 transparent gif
    return new Response(new Uint8Array([71,73,70,56,57,97,1,0,1,0,128,0,0,0,0,0,255,255,255,33,249,4,1,0,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0,59]), { headers: { 'Content-Type': 'image/gif' } });
  }

  async handleClearVisitors() {
    const s = await this.state.storage.get('stats') || {};
    s.visits = 0; s.visitsByDay = {}; s.visitsByPage = {};
    s.byCountry = {}; s.byCity = {}; s.uniqueIPs = [];
    await this.state.storage.put('stats', s);
    await this.state.storage.put('visitorLog', []);
    return json({ ok: true });
  }

  async handleMessages() {
    const messages = await this.state.storage.get('messages') || [];
    return json(messages.slice(-50));
  }

  async handleQuota(request) {
    const body = await request.json().catch(() => ({}));
    const payload = await verifyToken(body.token);
    if (!payload) return json({ ok: false, error: 'Unauthorized' }, 401);
    return json({ ok: true, quota: await this.getQuota(payload.username) });
  }

  async handleBuy(request) {
    const body = await request.json().catch(() => ({}));
    const payload = await verifyToken(body.token);
    if (!payload) return json({ ok: false, error: 'Unauthorized' }, 401);
    const pkg = body.pkg || 'once';
    // ?=  + 200
    const YEAR_PRICE = 299;
    let label = '', price = 0;
    if (pkg === 'sub') { label = 'Monthly'; price = 29.9; }
    else if (pkg === 'sub_year') { label = 'Yearly'; price = YEAR_PRICE; }
    else { label = ''; price = YEAR_PRICE + 200; }

    //  Native 
    if (wxConfigured(this.env)) {
      try {
        const outTradeNo = 'UG' + Date.now() + Math.floor(Math.random() * 1000);
        const r = await wxOrder(wxCtx(this.env), {
          description: 'ugochat ' + label,
          outTradeNo,
          amountYuan: price,
          attach: JSON.stringify({ username: payload.username, pkg })
        });
        //  -> 
        const orders = await this.state.storage.get('wxOrders') || {};
        orders[outTradeNo] = { username: payload.username, pkg, amount: price, ts: Date.now(), paid: false };
        await this.state.storage.put('wxOrders', orders);
        return json({ ok: true, mock: false, code_url: r.code_url, outTrade_no: outTradeNo, pkg, label, price });
      } catch (e) {
        return json({ ok: false, error: 'wechat order failed: ' + e.message }, 500);
      }
    }

    // 
    const payWechat = this.env.PAY_WECHAT_QR || '';
    const payAlipay = this.env.PAY_ALIPAY_QR || '';
    //  env secret storage 
    let personalWechat = payWechat, personalAlipay = payAlipay;
    if (!personalWechat && !personalAlipay) {
      const stored = await this.state.storage.get('payQr');
      if (stored && stored.dataUrl) {
        if (stored.kind === 'alipay') personalAlipay = stored.dataUrl;
        else personalWechat = stored.dataUrl;
      }
    }
    if (personalWechat || personalAlipay) {
      return json({
        ok: true, mock: false, personal: true,
        pkg, label, price,
        wechatUrl: personalWechat, alipayUrl: personalAlipay,
        note: 'Scan to pay',
      });
    }

    // 
    await this.setQuota(payload.username, -1); // -1 = ?    await this.pushQuota(payload.username);
    return json({ ok: true, quota: -1, mock: true, pkg, label, price, note: 'paid' });
  }

  async handlePayConfirm(request) {
    const body = await request.json().catch(() => ({}));
    const payload = await verifyToken(body.token);
    if (!payload) return json({ ok: false, error: 'Unauthorized' }, 401);
    const pkg = body.pkg || 'once';
    const pending = await this.state.storage.get('payPending') || [];
    // ?timestamp
    const existing = pending.findIndex(p => p.username === payload.username && p.pkg === pkg && p.status === 'pending');
    const entry = { username: payload.username, pkg, ts: Date.now(), status: 'pending' };
    if (existing >= 0) pending[existing] = entry;
    else pending.push(entry);
    await this.state.storage.put('payPending', pending);
    return json({ ok: true, pending: true });
  }

  async handlePayPending(request) {
    const body = await request.json().catch(() => ({}));
    const payload = await verifyToken(body.token);
    if (!payload) return json({ ok: false, error: 'Unauthorized' }, 401);
    const pending = await this.state.storage.get('payPending') || [];
    const mine = pending.filter(p => p.username === payload.username && p.status === 'pending');
    return json({ pending: mine });
  }

  //  +  done
  async handlePayApprove(request) {
    const body = await request.json().catch(() => ({}));
    const username = body.username;
    if (!username) return json({ ok: false, error: 'missing username' }, 400);
    await this.setQuota(username, -1);
    await this.pushQuota(username);
    const pending = await this.state.storage.get('payPending') || [];
    const updated = pending.map(p => p.username === username && p.status === 'pending' ? { ...p, status: 'approved' } : p);
    await this.state.storage.put('payPending', updated);
    return json({ ok: true });
  }

  async handlePayQr(request) {
    if (request.method === 'GET') {
      const stored = await this.state.storage.get('payQr') || null;
      return json(stored ? { dataUrl: stored.dataUrl, kind: stored.kind } : {});
    }
    const body = await request.json().catch(() => ({}));
    if (!body.dataUrl || !body.dataUrl.startsWith('data:image/')) return json({ ok: false, error: 'invalid dataUrl' }, 400);
    if (body.dataUrl.length > 200000) return json({ ok: false, error: 'image too large (<200KB)' }, 413);
    const kind = body.kind === 'alipay' ? 'alipay' : 'wechat';
    await this.state.storage.put('payQr', { dataUrl: body.dataUrl, kind, ts: Date.now() });
    return json({ ok: true });
  }

  //  DO storage 
  async handlePayConfig(request) {
    const wechatApi = !!(this.env.WECHAT_MCH_ID && this.env.WECHAT_V3_KEY);
    const payWechat = this.env.PAY_WECHAT_QR || '';
    const payAlipay = this.env.PAY_ALIPAY_QR || '';
    let storedWechat = '', storedAlipay = '';
    const stored = await this.state.storage.get('payQr');
    if (stored && stored.dataUrl) {
      if (stored.kind === 'alipay') storedAlipay = stored.dataUrl;
      else storedWechat = stored.dataUrl;
    }
    return json({
      wechatApi,
      personal: {
        wechat: !!(payWechat || storedWechat),
        alipay: !!(payAlipay || storedAlipay),
        wechatUrl: payWechat || storedWechat,
        alipayUrl: payAlipay || storedAlipay
      },
      prices: { sub: 29.9, sub_year: 299, once: 499 }
    });
  }

  async handleWxStatus(request) {
    const url = new URL(request.url);
    const outTradeNo = url.searchParams.get('no') || '';
    const token = url.searchParams.get('token') || '';
    const payload = await verifyToken(token);
    if (!payload) return json({ ok: false, error: 'Unauthorized' }, 401);
    const orders = await this.state.storage.get('wxOrders') || {};
    const o = orders[outTradeNo];
    if (!o) return json({ ok: false, error: 'order not found' }, 404);
    return json({ ok: true, paid: !!o.paid, quota: o.paid ? -1 : null });
  }

  async handleWxMark(url) {
    const outTradeNo = url.searchParams.get('no') || '';
    const orders = await this.state.storage.get('wxOrders') || {};
    const o = orders[outTradeNo];
    if (!o) return json({ ok: false, error: 'order not found' }, 404);
    if (o.paid) return json({ ok: true });
    o.paid = true;
    orders[outTradeNo] = o;
    await this.state.storage.put('wxOrders', orders);
    await this.setQuota(o.username, -1); // -1 = ?
    await this.pushQuota(o.username);
    return json({ ok: true });
  }
}

// Worker +?DO 
async function handleWechatNotify(request, env) {
  const ts = request.headers.get('Wechatpay-Timestamp') || '';
  const nonce = request.headers.get('Wechatpay-Nonce') || '';
  const sig = request.headers.get('Wechatpay-Signature') || '';
  const bodyStr = await request.text();
  try {
    if (env.WECHAT_PLATFORM_CERT) {
      const ok = await wxVerify(env, ts, nonce, bodyStr, sig);
      if (!ok) return new Response('signature verify failed', { status: 401 });
    }
  } catch (e) { /*  */ }
  let data;
  try { data = JSON.parse(bodyStr); } catch (e) { return new Response('bad json', { status: 400 }); }
  try {
    const plain = await wxDecrypt(env.WECHAT_V3_KEY, data.resource);
    // plain: { out_trade_no, trade_state, transaction_id, ... }
    if (plain.trade_state === 'SUCCESS') {
      const outTradeNo = plain.out_trade_no;
      const stub = env.CHAT.idFromName('global12');
      const doResp = await env.CHAT.get(stub).fetch(new Request('https://dummy/wxmark?no=' + encodeURIComponent(outTradeNo)));
      const j = await doResp.json().catch(() => ({}));
      if (j.ok) {
        return new Response(JSON.stringify({ code: 'SUCCESS', message: '' }), { headers: { 'Content-Type': 'application/json' } });
      }
    }
  } catch (e) { return new Response('decrypt failed', { status: 500 }); }
  return new Response(JSON.stringify({ code: 'SUCCESS', message: 'ok' }), { headers: { 'Content-Type': 'application/json' } });
}


// =====================  / Token  =====================
async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return buf2hex(hash);
}

async function verifyPassword(password, hash) {
  return (await hashPassword(password)) === hash;
}

async function createToken(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 604800000 }));
  const key = await crypto.subtle.importKey('raw', SECRET, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const msgBytes = new TextEncoder().encode(header + '.' + body);
  const sigBuf = await crypto.subtle.sign('HMAC', key, msgBytes);
  const sig = buf2base64(sigBuf);
  return header + '.' + body + '.' + sig;
}

async function verifyToken(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const key = await crypto.subtle.importKey('raw', SECRET, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sigBuf = base64tobuf(sig);
    const valid = await crypto.subtle.verify('HMAC', key, sigBuf, new TextEncoder().encode(header + '.' + body));
    if (!valid) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function filterBadWords(text) {
  let r = text;
  for (const w of BAD_WORDS) {
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    r = r.replace(re, '***');
  }
  return r;
}

function buf2hex(buf) {
  const arr = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < arr.length; i++) {
    hex += arr[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function buf2base64(buf) {
  const str = String.fromCharCode(...new Uint8Array(buf));
  return btoa(str);
}

function base64tobuf(b64) {
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  });
}
