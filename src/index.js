// TinyChat - Cloudflare Workers + Durable Objects
import HTML from './html.js';

const BAD_WORDS = ['fuck','shit','ass','bitch','damn','crap','dick','piss',
  'slut','whore','nigger','fag','asshole','bastard','cock','cunt',
  'fuckyou','fck','wtf','stfu','cao','sb'];

const SECRET = new TextEncoder().encode('tinychat-hmac-secret-2026');

// ===================== Worker 入口 =====================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/register' || path === '/api/login' ||
        path === '/api/users' || path === '/api/messages' ||
        path === '/chat') {
      const stub = env.CHAT.idFromName('global5');
      return env.CHAT.get(stub).fetch(request);
    }

    if (path === '/' || path === '/index.html') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
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
    this.wsUsers = new Map(); // ws → username
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
        default: return json({ error: 'Not found' }, 404);
      }
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  // ---- WebSocket ----
  async handleWebSocket(request, url) {
    const token = url.searchParams.get('token');
    const payload = await verifyToken(token);
    if (!payload) return new Response('Unauthorized', { status: 401 });
    const username = payload.username;

    const pair = new WebSocketPair();
    const server = pair[1];
    await this.state.acceptWebSocket(server, []);
    this.wsUsers.set(server, username);

    const messages = (await this.state.storage.get('messages') || []).slice(-50);
    let onlines = (await this.state.storage.get('onlineUsers') || []);
    if (onlines && typeof onlines === 'object' && !Array.isArray(onlines)) onlines = Object.keys(onlines);
    if (!Array.isArray(onlines)) onlines = [];
    if (!onlines.includes(username)) onlines.push(username);
    await this.state.storage.put('onlineUsers', onlines);

    await server.send(JSON.stringify({ type: 'init', username, onlineUsers: onlines, messages }));
    await this.broadcast({ type: 'online', username, onlineUsers: onlines });

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws, messageStr) {
    const username = this.wsUsers.get(ws);
    if (!username) return;

    try {
      const msg = JSON.parse(messageStr);
      if (!msg || !msg.type) return;
      switch (msg.type) {
        case 'message':
          await this.handleChatMessage(username, msg.text);
          break;
        case 'private':
          await this.handlePrivateMessage(username, msg.to, msg.text);
          break;
      }
    } catch(e) {}
  }

  async webSocketClose(ws, code, reason, wasClean) {
    const username = this.wsUsers.get(ws);
    if (!username) return;
    this.wsUsers.delete(ws);

    let onlines = (await this.state.storage.get('onlineUsers') || []);
    if (onlines && typeof onlines === 'object' && !Array.isArray(onlines)) {
      onlines = Object.keys(onlines);
    }
    if (!Array.isArray(onlines)) onlines = [];
    onlines = onlines.filter(u => u !== username);
    await this.state.storage.put('onlineUsers', onlines);

    await this.broadcast({ type: 'offline', username, onlineUsers: onlines });
  }

  // ---- 聊天逻辑 ----
  async handleChatMessage(username, text) {
    if (!text || !text.trim()) return;
    text = filterBadWords(text);

    const msg = { type: 'message', username, text, timestamp: Date.now() };

    let messages = await this.state.storage.get('messages') || [];
    messages.push(msg);
    if (messages.length > 500) messages = messages.slice(-500);
    await this.state.storage.put('messages', messages);

    await this.broadcast(msg);
  }

  async handlePrivateMessage(from, to, text) {
    if (!text || !text.trim() || !to) return;
    text = filterBadWords(text);

    const msg = { type: 'private', from, to, text, timestamp: Date.now() };

    const targetSockets = this.state.getWebSockets(to);
    for (const ws of targetSockets) {
      try { await ws.send(JSON.stringify({ ...msg, direction: 'incoming' })); } catch(e) {}
    }
    const fromSockets = this.state.getWebSockets(from);
    for (const ws of fromSockets) {
      try { await ws.send(JSON.stringify({ ...msg, direction: 'outgoing' })); } catch(e) {}
    }
  }

  async broadcast(msg) {
    const str = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      try { await ws.send(str); } catch(e) {}
    }
  }

  // ---- HTTP API ----
  async handleRegister(request) {
    const body = await request.json();
    const username = (body.username || '').trim();
    const password = body.password || '';

    if (username.length < 2 || password.length < 4) {
      return json({ ok: false, error: 'Username min 2 chars, password min 4 chars' }, 400);
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      return json({ ok: false, error: 'Username: letters, digits, underscore, Chinese only' }, 400);
    }

    let users = await this.state.storage.get('users') || {};
    if (users[username]) {
      return json({ ok: false, error: 'Username taken' }, 409);
    }

    users[username] = { hash: await hashPassword(password), createdAt: Date.now() };
    await this.state.storage.put('users', users);
    return json({ ok: true });
  }

  async handleLogin(request) {
    const body = await request.json();
    const username = (body.username || '').trim();
    const password = body.password || '';

    let users = await this.state.storage.get('users') || {};
    const user = users[username];
    if (!user || !(await verifyPassword(password, user.hash))) {
      return json({ ok: false, error: 'Wrong username or password' }, 401);
    }

    const token = await createToken({ username });
    return json({ ok: true, username, token });
  }

  async handleUsers() {
    const users = await this.state.storage.get('users') || {};
    const keys = Object.keys(users);
    return json({ value: keys, Count: keys.length });
  }

  async handleMessages() {
    const messages = await this.state.storage.get('messages') || [];
    return json(messages.slice(-50));
  }
}

// ===================== 密码 / Token 工具 =====================
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
