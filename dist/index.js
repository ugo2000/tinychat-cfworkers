// ugochat - bundled

// ---- WeChat Pay helpers ----
// WeChat Pay v3 helper (pure WebCrypto, ESM, no Node deps)
//  Cloudflare Secret 
//   WECHAT_MCH_ID      
//   WECHAT_APP_ID       AppID//
//   WECHAT_SERIAL       API 
//   WECHAT_PRIVATE_KEY  API PEM -----BEGIN/END-----
//   WECHAT_V3_KEY      APIv3 32 
//   WECHAT_PLATFORM_CERT PEM
//   WECHAT_NOTIFY_URL   https://chathub.asia/wechat/notify

function stripPem(pem, tag) {
  if (!pem) return null;
  const m = pem.replace(/\r/g, '').match(new RegExp('-----BEGIN ' + tag + '-----\\s*([\\s\\S]+?)-----END ' + tag + '-----'));
  if (!m) return null;
  return m[1].replace(/\s+/g, '');
}

async function importPrivateKey(pem) {
  const b64 = stripPem(pem, 'PRIVATE KEY') || stripPem(pem, 'RSA PRIVATE KEY');
  if (!b64) throw new Error('bad private key');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

async function importPublicCert(pem) {
  const b64 = stripPem(pem, 'PUBLIC KEY') || stripPem(pem, 'CERTIFICATE');
  if (!b64) throw new Error('bad platform cert');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('spki', der, { name: 'RSASSA-PKCS1-v5', hash: 'SHA-256' }, false, ['verify']);
}

function b64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function buildAuthHeader(ctx, method, urlPath, bodyStr) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const ts = Math.floor(Date.now() / 1000).toString();
  const message = method + '\n' + urlPath + '\n' + ts + '\n' + nonce + '\n' + (bodyStr || '') + '\n';
  return { nonce, ts, message };
}

async function signWeChat(ctx, method, urlPath, bodyStr) {
  const key = await importPrivateKey(ctx.privateKeyPem);
  const { nonce, ts, message } = buildAuthHeader(ctx, method, urlPath, bodyStr);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(message));
  const sigB64 = b64(sig);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${ctx.mchid}",nonce_str="${nonce}",signature="${sigB64}",timestamp="${ts}",serial_no="${ctx.serial}"`;
}

async function wechatUnifiedOrder(ctx, { description, outTradeNo, amountYuan, attach }) {
  const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/native';
  const urlPath = '/v3/pay/transactions/native';
  const body = {
    mchid: ctx.mchid,
    appid: ctx.appid,
    description: description,
    out_trade_no: outTradeNo,
    notify_url: ctx.notifyUrl,
    amount: { total: Math.round(amountYuan * 100), currency: 'CNY' }
  };
  if (attach) body.attach = attach;
  const bodyStr = JSON.stringify(body);
  const auth = await signWeChat(ctx, 'POST', urlPath, bodyStr);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: auth },
    body: bodyStr
  });
  const text = await res.text();
  if (!res.ok) throw new Error('unifiedorder failed: ' + res.status + ' ' + text);
  return JSON.parse(text); // { code_url, ... }
}

function decryptResource(v3key, resource) {
  const key = Uint8Array.from(atob(v3key), c => c.charCodeAt(0));
  if (key.length !== 32) throw new Error('v3 key must be 32 bytes');
  const nonce = Uint8Array.from(atob(resource.nonce), c => c.charCodeAt(0));
  const ad = resource.associated_data ? new TextEncoder().encode(resource.associated_data) : new Uint8Array(0);
  const ct = Uint8Array.from(atob(resource.ciphertext), c => c.charCodeAt(0));
  const tag = ct.slice(ct.length - 16);
  const data = ct.slice(0, ct.length - 16);
  const alg = { name: 'AES-GCM', iv: nonce, additionalData: ad, tagLength: 128 };
  // WebCrypto AES-GCM needs tag appended to data
  const combined = new Uint8Array(data.length + 16);
  combined.set(data); combined.set(tag, data.length);
  return crypto.subtle.decrypt(alg, { usages: [] }, key, combined).then(buf => {
    const json = new TextDecoder().decode(buf);
    return JSON.parse(json);
  });
}

async function verifyNotify(ctx, timestamp, nonce, bodyStr, sigB64) {
  if (!ctx.platformCertPem) return false; // 
  try {
    const cert = await importPublicCert(ctx.platformCertPem);
    const message = timestamp + '\n' + nonce + '\n' + bodyStr + '\n';
    const sig = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cert, sig, new TextEncoder().encode(message));
  } catch (e) { return false; }
}

function isConfigured(env) {
  return !!(env.WECHAT_MCH_ID && env.WECHAT_APP_ID && env.WECHAT_SERIAL && env.WECHAT_PRIVATE_KEY && env.WECHAT_V3_KEY && env.WECHAT_NOTIFY_URL);
}

function buildCtx(env) {
  return {
    mchid: env.WECHAT_MCH_ID,
    appid: env.WECHAT_APP_ID,
    serial: env.WECHAT_SERIAL,
    privateKeyPem: env.WECHAT_PRIVATE_KEY,
    v3key: env.WECHAT_V3_KEY,
    platformCertPem: env.WECHAT_PLATFORM_CERT,
    notifyUrl: env.WECHAT_NOTIFY_URL
  };
}


const wxConfigured = isConfigured;
const wxCtx = buildCtx;
const wxOrder = wechatUnifiedOrder;
const wxDecrypt = decryptResource;
const wxVerify = verifyNotify;

// ---- Main worker (fetch handler + DO) ----
// ugochat - Cloudflare Workers + Durable Objects
const BAD_WORDS = ['fuck','shit','ass','bitch','damn','crap','dick','piss',
  'slut','whore','nigger','fag','asshole','bastard','cock','cunt',
  'fuckyou','fck','wtf','stfu','cao','sb'];

const APP_VERSION = '20260816-0945';

const SECRET = new TextEncoder().encode('tinychat-hmac-secret-2026');

// Admin password is configured via Cloudflare secret ADMIN_PASSWORD (wrangler secret put ADMIN_PASSWORD)
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
      const body = await request.text();
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }));
    }

    if (path === '/api/pay-qr') {
      const pwd = url.searchParams.get('pwd') || '';
      if (pwd !== (env.ADMIN_PASSWORD || ADMIN_PASSWORD || '')) return json({ error: 'unauthorized' }, 401);
      const body = await request.text();
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }));
    }

    if (path === '/api/register' || path === '/api/login' || path === '/api/send-code' ||
        path === '/api/users' || path === '/api/messages' ||
        path === '/api/quota' || path === '/api/buy' || path === '/api/pay-confirm' || path === '/api/pay-pending') {
      const body = await request.text();
      const stub = env.CHAT.idFromName('global12');
      const newReq = new Request(request.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        duplex: 'half'
      });
      return env.CHAT.get(stub).fetch(newReq);
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
      if (pwd !== (env.ADMIN_PASSWORD || ADMIN_PASSWORD || '')) return json({ error: 'unauthorized' }, 401);
      const body = await request.text();
      const stub = env.CHAT.idFromName('global12');
      const req = new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, duplex: 'half' });
      return env.CHAT.get(stub).fetch(req);
    }
    if (path === '/admin/pending-list') {
      const pwd = url.searchParams.get('pwd') || '';
      if (pwd !== (env.ADMIN_PASSWORD || ADMIN_PASSWORD || '')) return json({ error: 'unauthorized' }, 401);
      const stub = env.CHAT.idFromName('global12');
      const req = new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', duplex: 'half' });
      return env.CHAT.get(stub).fetch(req);
    }
    if (path === '/api/pay-pending') {
      // Admin view: return all pending with screenshots (pwd in body)
      const body = await request.text().catch(() => '{}');
      let parsed;
      try { parsed = JSON.parse(body); } catch { parsed = {}; }
      if (parsed.pwd) {
        if (parsed.pwd !== (env.ADMIN_PASSWORD || ADMIN_PASSWORD || '')) return json({ error: 'unauthorized' }, 401);
        const stub = env.CHAT.idFromName('global12');
        const req = new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, duplex: 'half' });
        return env.CHAT.get(stub).fetch(req);
      }
    }
    if (path === '/admin/pay-approve') {
      const pwd = url.searchParams.get('pwd') || '';
      if (pwd !== (env.ADMIN_PASSWORD || ADMIN_PASSWORD || '')) return json({ error: 'unauthorized' }, 401);
      const body = await request.text();
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }));
    }
    if (path === '/admin/clear-visitors') {
      const pwd = url.searchParams.get('pwd') || '';
      if (pwd !== (env.ADMIN_PASSWORD || ADMIN_PASSWORD || '')) return json({ error: 'unauthorized' }, 401);
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(new Request('https://dummy/clear-visitors', { method: 'GET' }));
    }
    if (path === '/admin/clear-users') {
      const pwd = url.searchParams.get('pwd') || '';
      if (pwd !== (env.ADMIN_PASSWORD || ADMIN_PASSWORD || '')) return json({ error: 'unauthorized' }, 401);
      const confirm = url.searchParams.get('confirm') || '';
      const stub = env.CHAT.idFromName('global12');
      return env.CHAT.get(stub).fetch(new Request('https://dummy/admin/clear-users?confirm=' + confirm, { method: 'GET' }));
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
      // Inject the page-specific script into the HTML
      const aboutHtml = ABOUT_HTML.replace('</body>', '<script>' + ABOUT_SCRIPT + '</script></body>');
      return new Response(aboutHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    if (path === '/faq') {
      return new Response(FAQ_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/features') {
      return new Response(FEATURES_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/anonymous-chat') {
      return new Response(ANONYMOUS_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/random-chat') {
      return new Response(RANDOM_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/online-chat') {
      return new Response(ONLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/privacy') {
      return new Response(PRIVACY_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/terms') {
      return new Response(TERMS_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/safety') {
      return new Response(SAFETY_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/sitemap.xml') {
      return new Response(SITEMAP_XML, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'max-age=86400' } });
    }

    if (path === '/robots.txt') {
      return new Response(ROBOTS_TXT, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'max-age=86400' } });
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
      if (pwd !== (env.ADMIN_PASSWORD || ADMIN_PASSWORD || '')) {
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
        case '/api/register':  return await this.handleRegister(request);
        case '/api/send-code':   return await this.handleSendCode(request);
        case '/api/login':       return await this.handleLogin(request);
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
        case '/admin/pending-list': return await this.handleAdminPending();
        case '/admin/pay-pending': return await this.handleAdminPending();
        case '/admin/pay-approve': return await this.handlePayApprove(request);
        case '/track':       return await this.handleTrack(url);
        case '/clear-visitors': return await this.handleClearVisitors();
        case '/admin/clear-users': return await this.handleClearUsers(request);
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
  async handleSendCode(request) {
    const body = await request.json();
    const email = (body.email || '').trim();
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return json({ ok: false, error: 'Invalid email' }, 400);
    }
    // Check if email already registered
    let users = await this.state.storage.get('users') || {};
    for (const u of Object.values(users)) {
      if (u.email === email) {
        return json({ ok: false, error: 'Email already registered' }, 409);
      }
    }
    // rate limit: max 1 per minute per email
    const lastSent = await this.state.storage.get('codeSent:' + email);
    if (lastSent && Date.now() - lastSent < 60000) {
      return json({ ok: false, error: 'Please wait 60 seconds before requesting a new code' }, 429);
    }
    // generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.state.storage.put('code:' + email, { code, ts: Date.now() });
    await this.state.storage.put('codeSent:' + email, Date.now());
    // TODO: send email via configured email service (for now, log it)
    console.log('[TinyChat] Verification code for', email, ':', code);
    // For development: return code in response (remove in production!)
    const emailConfigured = !!this.env.RESEND_API_KEY;
    if (!emailConfigured) {
      return json({ ok: true, code, message: 'Code generated (email not configured, check server log)' });
    }
    // Send email via Resend API
    try {
      // 娉ㄦ剰锛氶渶瑕佸湪 Resend 鎺у埗鍙伴獙璇佸煙鍚?chathub.asia
      // 鎴栬€呬娇鐢?Resend 鎻愪緵鐨勬祴璇曞湴鍧€ onboarding@resend.dev
      const fromAddr = (this.env.RESEND_FROM || 'noreply@chathub.asia');
      const emailResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.env.RESEND_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddr,
          to: email,
          subject: 'Your verification code for TinyChat',
          html: `<p>Your verification code is: <strong>${code}</strong></p><p>It will expire in 10 minutes.</p>`
        })
      });
      if (!emailResp.ok) {
        const err = await emailResp.text();
        console.error('[TinyChat] Failed to send email:', err);
        // Fallback to dev mode: return code in response so registration still works
        // (e.g. Resend test mode only allows sending to verified email, or domain not verified)
        return json({ ok: true, code, dev: true, message: 'Email service unavailable, code shown for dev mode' });
      }
      return json({ ok: true, message: 'Code sent to ' + email });
    } catch (e) {
      console.error('[TinyChat] Email send error:', e);
      // Fallback to dev mode on any email failure
      return json({ ok: true, code, dev: true, message: 'Email service error, code shown for dev mode' });
    }
  }

  async handleRegister(request) {
    const body = await request.json();
    const username = (body.username || '').trim();
    const password = body.password || '';
    const email = (body.email || '').trim();
    const code = (body.code || '').trim();

    if (username.length < 2 || password.length < 4) {
      return json({ ok: false, error: 'Username min 2 chars, password min 4 chars' }, 400);
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return json({ ok: false, error: 'Username: letters, digits, underscore only' }, 400);
    }
    // email is required now
    if (!email) {
      return json({ ok: false, error: 'Email required' }, 400);
    }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return json({ ok: false, error: 'Invalid email format' }, 400);
    }
    // verify code
    if (!code) {
      return json({ ok: false, error: 'Verification code required' }, 400);
    }
    const storedCode = await this.state.storage.get('code:' + email);
    if (!storedCode || storedCode.code !== code) {
      return json({ ok: false, error: 'Invalid verification code' }, 400);
    }
    if (Date.now() - storedCode.ts > 600000) { // 10 minutes
      return json({ ok: false, error: 'Verification code expired' }, 400);
    }
    // clear used code
    await this.state.storage.delete('code:' + email);

    let users = await this.state.storage.get('users') || {};
    if (users[username]) {
      return json({ ok: false, error: 'Username taken' }, 409);
    }
    // uniqueness check by email
    for (const u of Object.values(users)) { if (u.email === email) return json({ ok: false, error: 'Email already registered' }, 409); }

    users[username] = { hash: await hashPassword(password), createdAt: Date.now(), quota: 100, email };
    await this.state.storage.put('users', users);
    await this._inc('registersTotal');
    const token = await createToken({ username });
    return json({ ok: true, username, token, quota: 100 });
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

  async handleClearUsers(request) {
    const url = new URL(request.url);
    const confirm = url.searchParams.get('confirm') || '';
    if (confirm !== 'YES_DELETE_ALL_USERS') {
      return json({ ok: false, error: 'Please add ?confirm=YES_DELETE_ALL_USERS to confirm' }, 400);
    }
    // Clear all users
    await this.state.storage.delete('users');
    // Clear all verification codes
    try {
      const list = await this.state.storage.list();
      const keys = [];
      for (const [key, value] of list) {
        if (key.startsWith('code:') || key.startsWith('codeSent:')) {
          keys.push(key);
        }
      }
      for (const key of keys) {
        await this.state.storage.delete(key);
      }
    } catch (e) {
      console.error('Error listing keys:', e);
    }
    return json({ ok: true, message: 'All users and verification codes cleared' });
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

    // No payment method configured and no QR stored - do NOT auto-grant quota.
    return json({ ok: false, error: 'Payment not configured. Contact admin.' }, 400);
  }

  async handlePayConfirm(request) {
    const body = await request.json().catch(() => ({}));
    const payload = await verifyToken(body.token);
    if (!payload) return json({ ok: false, error: 'Unauthorized' }, 401);
    const pkg = body.pkg || 'once';
    const pending = await this.state.storage.get('payPending') || [];
    const existing = pending.findIndex(p => p.username === payload.username && p.pkg === pkg && p.status === 'pending');
    const entry = { username: payload.username, pkg, ts: Date.now(), status: 'pending', screenshot: body.screenshot || '' };
    if (existing >= 0) pending[existing] = entry;
    else pending.push(entry);
    await this.state.storage.put('payPending', pending);
    return json({ ok: true, pending: true });
  }

  // Admin view: all pending with screenshots
  async handleAdminPending() {
    const pending = await this.state.storage.get('payPending') || [];
    const all = pending.filter(p => p.status === 'pending');
    return json({ ok: true, pending: all });
  }

  async handlePayPending(request) {
    const body = await request.json().catch(() => ({}));
    const payload = await verifyToken(body.token);
    if (!payload) return json({ ok: false, error: 'Unauthorized' }, 401);
    const pending = await this.state.storage.get('payPending') || [];
    const mine = pending.filter(p => p.username === payload.username);
    const approved = mine.some(p => p.status === 'approved') || (await this.getQuota(payload.username)) < 0;
    const hasPending = mine.some(p => p.status === 'pending');
    return json({ approved, pending: hasPending });
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


// ---- HTML template constants (at end for file size, not execution order) ----
const HTML = "<!DOCTYPE html>\r\n<html lang=\"zh-CN\">\r\n<head>\r\n<meta charset=\"UTF-8\">\r\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\">\r\n<title>ugochat</title>\r\n<style>\r\n*{margin:0;padding:0;box-sizing:border-box}\r\nbody{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;min-height:100vh;display:flex;flex-direction:column;align-items:center}\r\n.container{width:100%;max-width:420px;min-height:100vh;max-height:800px;display:flex;flex-direction:column;background:#fff;box-shadow:0 2px 20px rgba(0,0,0,.08)}\r\n.topnav{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#1a73e8;color:#fff;font-size:14px;flex-shrink:0;flex-wrap:wrap;gap:4px}\r\n.topnav .brand{font-size:16px;font-weight:600;cursor:pointer}\r\n.topnav .nav-links{display:flex;gap:6px;flex-wrap:wrap}\r\n.topnav .nav-link{color:#fff;opacity:.85;cursor:pointer;text-decoration:none;padding:3px 8px;border-radius:12px;background:rgba(255,255,255,.1);font-size:13px}\r\n.topnav .nav-link:hover,.topnav .nav-link.active{opacity:1;background:rgba(255,255,255,.25)}\r\n.topnav .nav-right{display:flex;align-items:center;gap:6px}\r\n.topnav .nav-link.lang-btn{background:rgba(255,255,255,.15)}\r\n.page{display:none;flex-direction:column;flex:1;overflow:hidden;min-height:0}\r\n.page.active{display:flex}\r\n.form-page{padding:32px 24px;justify-content:center;flex-shrink:0;min-height:0}\r\n.form-page h2{text-align:center;margin-bottom:20px;color:#1a1a1a;font-size:20px}\r\n.form-group{margin-bottom:14px}\r\n.form-group label{display:block;margin-bottom:4px;color:#555;font-size:13px}\r\n.form-group input,select{padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;width:100%;outline:none}\r\n.form-group input:focus,select:focus{border-color:#1a73e8}\r\n.btn{padding:10px 20px;background:#1a73e8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;width:100%;margin-top:4px}\r\n.btn:hover{background:#1557b0}\r\n.btn.secondary{background:#666;margin-top:8px}\r\n.btn.secondary:hover{background:#555}\r\n.link-btn{background:none;border:none;color:#1a73e8;cursor:pointer;font-size:13px;padding:4px 0;text-align:center;width:100%;margin-top:8px}\r\n.link-btn:hover{text-decoration:underline}\r\n.err{color:#d32f2f;font-size:12px;margin-top:4px;min-height:16px;text-align:center}\r\n.header{background:#1a73e8;color:#fff;padding:10px 14px;display:flex;align-items:center;gap:8px;font-size:13px;flex-shrink:0;flex-wrap:wrap}\r\n.header .conn-dot{font-size:12px}\r\n.header .sound-btn{font-size:14px;background:none;border:none;cursor:pointer;padding:0 2px;vertical-align:middle}\r\n.header .my-name{font-size:12px;color:#1565c0;font-weight:600;padding:2px 8px;background:#e3f2fd;border-radius:10px;margin:0 4px}\r\n.header .online-count{margin-left:auto;font-size:12px;opacity:.85}\r\n.chat-header{display:flex;align-items:center;padding:6px 10px;background:#f8f9fa;border-bottom:1px solid #e0e0e0;gap:6px;flex-wrap:wrap;flex-shrink:0}\r\n.chat-header select,input{padding:5px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;max-width:140px}\r\n.dm-target{display:flex;gap:4px;align-items:center;margin-left:auto}\r\n.dm-target input{max-width:100px}\r\n.dm-target button{background:#1a73e8;color:#fff;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:12px}\r\n.private-mode{font-size:12px;color:#f57c00;background:#fff3e0;padding:2px 8px;border-radius:10px;white-space:nowrap}\r\n.random-banner{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#e8f5e9;color:#2e7d32;font-size:13px;flex-shrink:0;flex-wrap:wrap}\r\n.random-banner button{padding:3px 10px;border:none;border-radius:6px;cursor:pointer;font-size:12px}\r\n.random-next{background:#4caf50;color:#fff}\r\n.random-exit{background:#f44336;color:#fff}\r\n.quota-badge{background:#ff9800;color:#fff;padding:2px 8px;border-radius:10px;font-size:12px;white-space:nowrap}\r\n.upgrade-btn{background:#ff5722;color:#fff;border:none;padding:4px 10px;border-radius:10px;font-size:12px;cursor:pointer;white-space:nowrap}\r\n.msg-area{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;min-height:0}\r\n.msg{background:#f0f2f5;padding:7px 11px;border-radius:12px;max-width:75%;word-break:break-word;font-size:14px;line-height:1.4}\r\n.msg .uname{font-weight:600;color:#1a73e8;font-size:13px;margin-bottom:2px}\r\n.msg .geo{font-size:11px;opacity:.65;margin-left:5px;font-weight:normal}\r\n.msg .ts{font-size:10px;color:#999;margin-top:2px;display:block;text-align:right}\r\n.msg.outgoing{background:#e3f2fd;align-self:flex-end}\r\n.msg.incoming{background:#f0f2f5;align-self:flex-start}\r\n.msg.private{background:#fff8e1;border:1px solid #ffe082}\r\n.msg.system{background:#fce4ec;color:#c62828;max-width:90%;text-align:center;font-size:13px}\r\n.emoji-btn{background:none;border:none;cursor:pointer;font-size:17px;padding:1px 3px;vertical-align:middle}.emoji-panel{display:none;position:absolute;bottom:50px;left:6px;background:#fff;border:1px solid #ddd;border-radius:12px;padding:10px 8px 6px;z-index:200;box-shadow:0 4px 16px rgba(0,0,0,.18);min-width:280px}.emoji-panel.open{display:block}.emoji-grid{display:flex;flex-wrap:wrap;gap:5px;max-width:264px}.emoji-item{width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:8px;font-size:22px;transition:background .12s}.emoji-item:hover{background:#e8f0fe}.chat-emoji{width:22px;height:22px;vertical-align:middle;margin:0 1px}\r\n.input-bar{display:flex;gap:6px;padding:8px 10px;border-top:1px solid #e0e0e0;flex-shrink:0;align-items:center;flex-wrap:wrap}\r\n.input-bar input{flex:1;padding:9px 12px;border:1px solid #ddd;border-radius:20px;outline:none;font-size:14px;min-width:0}\r\n.input-bar input:focus{border-color:#1a73e8}\r\n.input-bar button{padding:9px 16px;background:#1a73e8;color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:14px;white-space:nowrap}\r\n.rand-btn{padding:8px 14px;background:#4caf50;color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:13px;margin-left:auto}\r\n.rand-btn:hover{background:#388e3c}\r\n.rand-btn.active{background:#ff9800}\r\n.rand-btn .rnext{background:#f44336;padding:3px 8px;border-radius:6px;margin-left:6px}\r\n.rand-btn .rexit{background:#666;padding:3px 8px;border-radius:6px;margin-left:4px}\r\n.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;justify-content:center;align-items:center;z-index:1000}\r\n.modal-overlay.show{display:flex}\r\n.modal{background:#fff;border-radius:12px;padding:20px;max-width:340px;width:90%;max-height:80vh;overflow-y:auto}\r\n.modal h3{text-align:center;margin-bottom:14px;font-size:16px;color:#1a1a1a}\r\n.buy-options{display:flex;flex-direction:column;gap:10px}\r\n.buy-opt{padding:12px;border:2px solid #e0e0e0;border-radius:10px;cursor:pointer;text-align:center;transition:border-color .2s}\r\n.buy-opt:hover{border-color:#1a73e8}\r\n.buy-opt.best{border-color:#ff9800;background:#fff8e1}\r\n.buy-opt .pkg{font-weight:600;font-size:15px;color:#333}\r\n.buy-opt .price{font-size:20px;font-weight:700;color:#1a73e8;margin:4px 0}\r\n.buy-opt .label{font-size:12px;color:#666}\r\n.buy-close{text-align:center;margin-top:12px}\r\n.buy-close button{background:#999;color:#fff;border:none;padding:8px 20px;border-radius:8px;cursor:pointer}\r\n#buyQrArea{margin-top:12px;text-align:center}\r\n#buyQrTip{font-size:13px;color:#666;margin-bottom:8px}\r\n#buyQrImg{margin:0 auto;display:block;max-width:200px}\r\n.buy-paid-btn{background:#4caf50;color:#fff;border:none;padding:10px;width:100%;border-radius:8px;font-size:14px;cursor:pointer;margin-top:10px}\r\n.buy-note{margin-top:8px;font-size:12px;color:#999;text-align:center}\r\n.logout-btn{background:rgba(255,255,255,.15);border:none;color:#fff;padding:3px 10px;border-radius:12px;cursor:pointer;font-size:12px}\r\n</style>\r\n</head>\r\n<body>\r\n<div class=\"container\">\r\n<div class=\"topnav\">\r\n<span class=\"brand\" onclick=\"navChat()\">&#128172; ugochat</span>\r\n<div class=\"nav-links\">\r\n<span class=\"nav-link\" id=\"navChat\" onclick=\"navChat()\" data-i18n=\"navChat\">&#128172; ugochat</span>\r\n<span class=\"nav-link\" id=\"navRandom\" onclick=\"navRandom()\">&#127922; Random</span>\r\n<span class=\"nav-link\" id=\"navPricing\" onclick=\"navPricing()\" target=\"_blank\">&#128176; Pricing</span>\r\n<span class=\"nav-link\" id=\"navAbout\" onclick=\"navAbout()\" target=\"_blank\">&#9432; About</span>\r\n</div>\r\n<div class=\"nav-right\">\r\n\r\n<button class=\"logout-btn\" id=\"btnLogout\" onclick=\"doLogout()\" data-i18n=\"logoutBtn\">&#128682; Logout</button>\r\n</div>\r\n</div>\r\n<div id=\"pageLogin\" class=\"page form-page\">\r\n<h2 data-i18n=\"loginTitle\">Login</h2>\r\n<div class=\"form-group\"><label>Username or Email</label>\r\n<input id=\"loginUser\" maxlength=\"60\" autocomplete=\"off\" onkeydown=\"if(event.key==='Enter')doLogin()\"></div>\r\n<div class=\"form-group\"><label data-i18n=\"regLabelPass\">Password</label>\r\n<input id=\"loginPass\" type=\"password\" onkeydown=\"if(event.key==='Enter')doLogin()\"></div>\r\n<button class=\"btn\" onclick=\"doLogin()\" data-i18n=\"loginBtn\">Login</button>\r\n<div class=\"err\" id=\"loginError\"></div>\r\n<button class=\"link-btn\" onclick=\"showRegister()\" data-i18n=\"noAccount\">No account? Register</button>\r\n<button class=\"link-btn\" onclick=\"navAbout()\" data-i18n=\"aboutLink\">About ugochat</button>\r\n</div>\r\n<div id=\"pageRegister\" class=\"page form-page\">\r\n<h2 data-i18n=\"regTitle\">Register</h2>\r\n<div class=\"form-group\"><label data-i18n=\"regLabelUser\">Username</label>\r\n<input id=\"regUser\" maxlength=\"20\" autocomplete=\"off\"></div>\r\n<div class=\"form-group\"><label data-i18n=\"regLabelPass\">Password</label>\r\n<input id=\"regPass\" type=\"password\"></div>\r\n<div class=\"form-group\"><label data-i18n=\"regLabelPassConfirm\">Confirm Password</label>\r\n<input id=\"regPassConfirm\" type=\"password\" onkeydown=\"if(event.key==='Enter')doRegister()\"></div>\r\n<div class=\"form-group\"><label>Email <span style=\"color:#f44336\">*</span></label>\r\n<input id=\"regEmail\" type=\"email\" maxlength=\"60\" required></div>\r\n<div class=\"form-group\"><label data-i18n=\"regLabelCode\">Verification Code</label>\r\n<div style=\"display:flex;gap:6px\"><input id=\"regCode\" maxlength=\"6\" style=\"flex:1\"><button type=\"button\" id=\"sendCodeBtn\" onclick=\"sendVerifyCode()\" data-i18n=\"sendCodeBtn\">Send Code</button></div></div>\r\n<button class=\"btn\" onclick=\"doRegister()\" data-i18n=\"regBtn\">Register</button>\r\n<div class=\"err\" id=\"regError\"></div>\r\n<button class=\"link-btn\" onclick=\"showLogin()\" data-i18n=\"hasAccount\">Has account? Login</button>\r\n</div>\r\n<div id=\"pageChat\" class=\"page\">\r\n<div class=\"chat-header\">\r\n<span class=\"conn-dot\" id=\"connDot\">&#128308;</span>\r\n<button class=\"sound-btn\" id=\"soundBtn\" onclick=\"toggleSound()\" title=\"Toggle sound\">&#128266;</button>\r\n<span class=\"my-name\" id=\"myName\"></span>\r\n<select id=\"privateTo\" onchange=\"onSelectChange()\"><option value=\"\" data-i18n=\"selectPrivate\">Public Chat</option></select>\r\n<div class=\"dm-target\"><input id=\"dmInput\" data-i18n=\"dmPlaceholder\" placeholder=\"Username\"><button id=\"dmBtn\" onclick=\"applyDmInput()\">DM</button></div>\r\n<span class=\"private-mode\" id=\"privateMode\" style=\"display:none\"></span>\r\n<button class=\"btn rand-btn\" id=\"btnRandom\" onclick=\"startRandom()\">&#127922;</button>\r\n<span class=\"quota-badge\" id=\"quotaBadge\" style=\"display:none\"></span>\r\n<button class=\"upgrade-btn\" id=\"btnUpgrade\" onclick=\"openBuy()\" data-i18n=\"upgradeBtn\">&#11088; 升级</button>\r\n<span class=\"online-count\" id=\"onlineCount\"></span>\r\n</div>\r\n<div class=\"random-banner\" id=\"randomBanner\" style=\"display:none\">\r\n<span id=\"randomStatus\"></span>\r\n<button class=\"random-next\" id=\"randomNextBtn\" onclick=\"nextRandom()\">Next</button>\r\n<button class=\"random-exit\" onclick=\"exitRandom()\">Exit</button>\r\n</div>\r\n<div class=\"msg-area\" id=\"msgArea\"></div>\r\n<div class=\"input-bar\">\r\n<input id=\"msgInput\" disabled placeholder=\"...\" onkeydown=\"if(event.key==='Enter'&&!event.shiftKey)sendMsg()\">\r\n<button class=\"emoji-btn\" id=\"emojiBtn\" onclick=\"toggleEmojiPanel()\">&#128515;</button>\r\n<div class=\"emoji-panel\" id=\"emojiPanel\"><div class=\"emoji-grid\" id=\"emojiGrid\"></div></div><button onclick=\"sendMsg()\" id=\"sendBtn\">&#10148;</button>\r\n<button class=\"rand-btn\" id=\"randBtn\" onclick=\"startRandom()\">&#127922;</button>\r\n</div>\r\n</div>\r\n</div>\r\n<div class=\"modal-overlay\" id=\"buyModal\">\r\n<div class=\"modal\">\r\n<h3 data-i18n=\"buyTitle\">Upgrade</h3>\r\n<div class=\"buy-options\" id=\"buyOptions\">\r\n<div class=\"buy-opt\" onclick=\"doBuy('once')\"><div class=\"pkg\" data-i18n=\"pkgOnce\">Lifetime</div><div class=\"price\">&#165;499</div><div class=\"label\" data-i18n=\"lblOnce\">One-time, unlimited</div></div>\r\n<div class=\"buy-opt best\" onclick=\"doBuy('sub_year')\"><div class=\"pkg\" data-i18n=\"pkgYear\">Yearly</div><div class=\"price\">&#165;299</div><div class=\"label\" data-i18n=\"lblYear\">per year, unlimited</div></div>\r\n<div class=\"buy-opt\" onclick=\"doBuy('sub')\"><div class=\"pkg\" data-i18n=\"pkgMonth\">Monthly</div><div class=\"price\">&#165;29.9</div><div class=\"label\" data-i18n=\"lblMonth\">per month, unlimited</div></div>\r\n</div>\r\n<div id=\"buyQrArea\" style=\"display:none\">\r\n<div id=\"buyQrTip\"></div>\r\n<img id=\"buyQrImg\" style=\"display:none\">\r\n<div id=\"buyUploadArea\" style=\"display:none;margin:8px 0\">\r\n<div class=\"upload-hint\">Upload payment screenshot to confirm:</div>\r\n<input type=\"file\" id=\"buyScreenshot\" accept=\"image/*\" style=\"font-size:12px\">\r\n<img id=\"buyScreenshotPreview\" style=\"display:none;max-width:180px;max-height:180px;border:1px solid #ccc;border-radius:6px;margin-top:6px\">\r\n</div>\r\n<div id=\"buyPaidBtnArea\" style=\"display:none\"><button class=\"buy-paid-btn\" id=\"buyPaidBtn\" data-i18n=\"paidBtn\" onclick=\"confirmPaid()\">I Paid</button></div>\r\n</div>\r\n<div id=\"buyResult\" style=\"display:none;text-align:center;padding:10px 0\">\r\n<div id=\"buyResultText\" style=\"font-size:15px;color:#2e7d32;font-weight:600\"></div>\r\n<button class=\"buy-close\" onclick=\"closeBuy()\">Close</button>\r\n</div>\r\n<div class=\"buy-note\" id=\"buyNote\" data-i18n=\"buyNote\"></div>\r\n<div class=\"buy-close\" id=\"buyCloseBtn\"><button onclick=\"closeBuy()\">Close</button></div>\r\n</div>\r\n</div>\r\n<\/script>\r\nconst wsUrl = 'wss://' + location.host + '/chat';\r\nconst TINYCHAT_VER = '20260816-0945';\r\n(function(){ try { fetch('/api/version').then(r=>r.json()).then(d=>{ if(d&&d.version&&d.version!==TINYCHAT_VER){ localStorage.setItem('tinychat_version', d.version); location.reload(true); } }).catch(()=>{}); } catch(e){} })();\r\nlet ws, token, username, quota = 100, geo = '', manualClose = false, soundEnabled = true;\r\nlet audioCtx = null;\r\nfunction getAudioCtx() {\r\n  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();\r\n  return audioCtx;\r\n}\r\nfunction playTone(freq, dur, vol) {\r\n  if (!soundEnabled) return;\r\n  try {\r\n    const ctx = getAudioCtx();\r\n    const osc = ctx.createOscillator();\r\n    const gain = ctx.createGain();\r\n    osc.connect(gain); gain.connect(ctx.destination);\r\n    osc.frequency.value = freq;\r\n    gain.gain.setValueAtTime(vol || 0.25, ctx.currentTime);\r\n    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);\r\n    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);\r\n  } catch(e) {}\r\n}\r\nfunction playMsgSound() { playTone(880, 0.12, 0.2); }\r\nfunction playNotifSound() { playTone(523, 0.08, 0.15); playTone(659, 0.08, 0.15); }\r\nfunction toggleSound() {\r\n  soundEnabled = !soundEnabled;\r\n  const btn = document.getElementById('soundBtn');\r\n  if (btn) btn.innerHTML = soundEnabled ? '&#128266;' : '&#128263;';\r\n  localStorage.setItem('tinychat_sound', soundEnabled ? '1' : '0');\r\n}\r\nlet reconnectTimer = null, reconnectAttempts = 0;\r\nlet privateTo = '', randomPeer = null, randomFinding = false;\r\nlet lang = localStorage.getItem('tinychat_lang') || 'en';\r\nlet pendingTimer = null;\r\nlet wxPollTimer = null;\r\nlet payPollTimer = null;\r\nfunction esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;'); }\r\nfunction api(path, body) {\r\n  const h = { 'Content-Type': 'application/json' };\r\n  if (token) h['Authorization'] = 'Bearer ' + token;\r\n  return fetch(path, { method: 'POST', headers: h, body: JSON.stringify(body || {}) });\r\n}\r\nfunction i18n(s) { return s || ''; }\r\nconst en = {\r\n  loginTitle:'Login', regTitle:'Register', loginBtn:'Login', regBtn:'Register',\r\n  regLabelUser:'Username', regLabelPass:'Password', regLabelPassConfirm:'Confirm Password', regLabelEmail:'Email', regLabelCode:'Verification Code',\r\n  sendCodeBtn:'Send Code', sendCodeSent:'Sent', sendCodeError:'Failed to send', codeSentTo:'Code sent to',\r\n  codeInvalid:'Invalid code', codeExpired:'Code expired',\r\n  regPlaceholderUser:'Username', regPlaceholderPass:'Password',\r\n  noAccount:'No account? Register', hasAccount:'Has account? Login',\r\n  passwordMismatch:'Passwords do not match',\r\n  aboutLink:'About ugochat',\r\n  selectPrivate:'Public Chat', meLabel:'(me)', dmPlaceholder:'Username', dmBtn:'DM',\r\n  privateHint:'DM: {u}', connected:'Connected', reconnecting:'Reconnecting...',\r\n  sessionExpired:'Session expired, please login again',\r\n  sendPlaceholder:'Type message...', sendBtn:'Send',\r\n  navChat:'Chat', navRandom:'Random', navAbout:'About', navPricing:'Pricing',\r\n  logoutBtn:'Logout',\r\n  quotaUsed:'Quota used: {n}', quotaExhausted:'Quota exhausted. Upgrade for unlimited.',\r\n  buyTitle:'Upgrade', pkgOnce:'Lifetime', lblOnce:'One-time, unlimited',\r\n  pkgYear:'Yearly', lblYear:'per year, unlimited',\r\n  pkgMonth:'Monthly', lblMonth:'per month, unlimited',\r\n  buyNote:'Scan the QR code with Alipay or WeChat to pay. After payment, click \"I Paid\" and your plan activates after confirmation.',\r\n  uploadHint:'Upload payment screenshot to confirm:',\r\n  paidBtn:'I Paid',\r\n  buySuccess:'Upgrade successful! Enjoy unlimited messaging.',\r\n  buyWaiting:'Waiting for admin approval...',\r\n  upgradeBtn:'Upgrade', quotaUnlimited:'Unlimited', quotaRemaining:'Messages left',\r\n  footerAbout:'About ugochat', footerContact:'Questions? Contact',\r\n  randomFinding:'Finding stranger...', randomPaired:'Paired! Say hi',\r\n  randomNext:'Next', randomExit:'Exit', randomLeft:'Stranger left'\r\n};\r\nconst zh = {\r\n  loginTitle:'登录', regTitle:'注册', loginBtn:'登录', regBtn:'注册',\r\n  regLabelUser:'用户名', regLabelPass:'密码', regLabelPassConfirm:'确认密码', regLabelEmail:'邮箱', regLabelCode:'验证码',\r\n  sendCodeBtn:'发送验证码', sendCodeSent:'已发送', sendCodeError:'发送失败', codeSentTo:'验证码已发送到',\r\n  codeInvalid:'验证码错误', codeExpired:'验证码已过期',\r\n  regPlaceholderUser:'用户名', regPlaceholderPass:'密码',\r\n  noAccount:'没有账号？注册', hasAccount:'已有账号？登录',\r\n  passwordMismatch:'两次密码不一致',\r\n  aboutLink:'关于 ugochat',\r\n  selectPrivate:'公开聊天', meLabel:'（我）', dmPlaceholder:'用户名', dmBtn:'私信',\r\n  privateHint:'私信: {u}', connected:'已连接', reconnecting:'重连中...',\r\n  sessionExpired:'会话过期，请重新登录',\r\n  sendPlaceholder:'输入消息...', sendBtn:'发送',\r\n  navChat:'聊天', navRandom:'随机', navAbout:'关于', navPricing:'价格',\r\n  logoutBtn:'退出',\r\n  quotaUsed:'已用配额: {n}', quotaExhausted:'配额用完，升级享无限',\r\n  buyTitle:'升级', pkgOnce:'买断', lblOnce:'一次性买断，无限消息',\r\n  pkgYear:'年付', lblYear:'每年无限',\r\n  pkgMonth:'月付', lblMonth:'每月无限',\r\n  buyNote:'使用支付宝或微信扫描二维码付款，付款后点\"已支付\"，审核通过后自动开通',\r\n  uploadHint:'上传付款截图确认:',\r\n  paidBtn:'已支付',\r\n  buySuccess:'升级成功！享受无限消息',\r\n  buyWaiting:'等待管理员审核...',\r\n  upgradeBtn:'升级', quotaUnlimited:'无限', quotaRemaining:'剩余消息',\r\n  footerAbout:'关于 ugochat', footerContact:'有问题？联系',\r\n  randomFinding:'寻找陌生人...', randomPaired:'配对成功！打个招呼',\r\n  randomNext:'下一个', randomExit:'退出', randomLeft:'陌生人已离开'\r\n};\r\nfunction t(k) { return (lang === 'zh' ? zh[k] : en[k]) || k; }\r\nfunction applyI18n() {\r\n  document.querySelectorAll('[data-i18n]').forEach(el => {\r\n    const k = el.getAttribute('data-i18n');\r\n    const txt = t(k);\r\n    if (el.tagName === 'INPUT') { el.placeholder = txt; } else { el.textContent = txt; }\r\n  });\r\n  document.querySelectorAll('.nav-link').forEach(el => { el.style.display = el.id && el.id.startsWith('nav') ? '' : ''; });\r\n  const btn = document.getElementById('btnLogout');\r\n  if (btn) {\r\n    btn.style.display = username ? '' : 'none';\r\n    if (username) btn.innerHTML = '&#128682; ' + t('logoutBtn');\r\n  }\r\n  const upBtn = document.getElementById('btnUpgrade');\r\n  if (upBtn) upBtn.style.display = username ? '' : 'none';\r\n  const navLangEl = document.getElementById('navLang');\r\n  if (navLangEl) navLangEl.textContent = lang === 'zh' ? 'EN' : '\\u4E2D';\r\n  if (privateTo) { const h = document.getElementById('privateMode'); if (h) h.textContent = 'DM: ' + privateTo; }\r\n  updateQuotaBadge();\r\n}\r\n\r\nfunction navChat() { if (!username) { showLogin(); return; } startChat(); }\r\nfunction navRandom() { if (!username) { showLogin(); } else startRandom(); }\r\nfunction navAbout() { window.open('/about', '_blank'); }\r\nfunction navPricing() { window.open('/pricing', '_blank'); }\r\nfunction showPage(id) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); const p = document.getElementById('page' + id); if (p) p.classList.add('active'); }\r\nfunction showLogin() { showPage('Login'); document.getElementById('loginUser').focus(); }\r\nfunction showRegister() { showPage('Register'); document.getElementById('regUser').focus(); }\r\nasync function doLogin() {\r\n  const u = document.getElementById('loginUser').value.trim();\r\n  const p = document.getElementById('loginPass').value;\r\n  document.getElementById('loginError').textContent = '';\r\n  try {\r\n    const r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u, password:p}) });\r\n    const d = await r.json();\r\n    if (!d.ok) { document.getElementById('loginError').textContent = d.error || 'Login failed'; return; }\r\n    token = d.token; username = d.username; quota = d.quota != null ? d.quota : 100;\r\n    localStorage.setItem('tinychat_token', token);\r\n    localStorage.setItem('tinychat_username', username);\r\n    startChat();\r\n  } catch(e) { document.getElementById('loginError').textContent = 'Network error'; }\r\n}\r\nasync function doRegister() {\r\n  const u = document.getElementById('regUser').value.trim();\r\n  const p = document.getElementById('regPass').value;\r\n  const pConfirm = document.getElementById('regPassConfirm').value;\r\n  const e = document.getElementById('regEmail') ? document.getElementById('regEmail').value.trim() : '';\r\n  const code = document.getElementById('regCode') ? document.getElementById('regCode').value.trim() : '';\r\n  document.getElementById('regError').textContent = '';\r\n  if (p !== pConfirm) {\r\n    document.getElementById('regError').textContent = t('passwordMismatch');\r\n    return;\r\n  }\r\n  if (!e) {\r\n    document.getElementById('regError').textContent = 'Email required';\r\n    return;\r\n  }\r\n  if (!code) {\r\n    document.getElementById('regError').textContent = 'Verification code required';\r\n    return;\r\n  }\r\n  try {\r\n    const r = await fetch('/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u, password:p, email:e, code:code}) });\r\n    const d = await r.json();\r\n    if (!d.ok) { document.getElementById('regError').textContent = d.error || 'Register failed'; return; }\r\n    token = d.token; username = d.username; quota = d.quota != null ? d.quota : 100;\r\n    localStorage.setItem('tinychat_token', token);\r\n    localStorage.setItem('tinychat_username', username);\r\n    startChat();\r\n  } catch(e) { document.getElementById('regError').textContent = 'Network error'; }\r\n}\r\nlet codeTimer = null, codeCountdown = 0;\r\nasync function sendVerifyCode() {\r\n  const e = document.getElementById('regEmail').value.trim();\r\n  const btn = document.getElementById('sendCodeBtn');\r\n  if (!e || !/^[^@]+@[^@]+\\.[^@]+$/.test(e)) {\r\n    document.getElementById('regError').textContent = 'Invalid email';\r\n    return;\r\n  }\r\n  if (codeCountdown > 0) return;\r\n  btn.disabled = true;\r\n  try {\r\n    const r = await fetch('/api/send-code', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:e}) });\r\n    const d = await r.json();\r\n    if (d.ok) {\r\n      // 在开发模式下，验证码会返回在响应中\r\n      let msg = t('codeSentTo') + ' ' + e;\r\n      if (d.code) {\r\n        msg = '验证码: ' + d.code + ' (开发模式)';\r\n        // 也显示英文\r\n        if (lang === 'en') msg = 'Verification code: ' + d.code + ' (dev mode)';\r\n      }\r\n      document.getElementById('regError').textContent = msg;\r\n      document.getElementById('regError').style.color = '#2e7d32'; // 绿色表示成功\r\n      codeCountdown = 60;\r\n      codeTimer = setInterval(() => {\r\n        if (codeCountdown <= 0) {\r\n          clearInterval(codeTimer);\r\n          btn.textContent = t('sendCodeBtn');\r\n          btn.disabled = false;\r\n        } else {\r\n          btn.textContent = codeCountdown + 's';\r\n          codeCountdown--;\r\n        }\r\n      }, 1000);\r\n    } else {\r\n      document.getElementById('regError').textContent = d.error || t('sendCodeError');\r\n      document.getElementById('regError').style.color = '#d32f2f';\r\n      btn.disabled = false;\r\n    }\r\n  } catch(err) {\r\n    document.getElementById('regError').textContent = t('sendCodeError');\r\n    document.getElementById('regError').style.color = '#d32f2f';\r\n    btn.disabled = false;\r\n  }\r\n}\r\nfunction startChat() {\r\n  token = localStorage.getItem('tinychat_token');\r\n  username = localStorage.getItem('tinychat_username');\r\n  if (!token || !username) { showLogin(); return; }\r\n  showPage('Chat');\r\n  applyI18n();\r\n  connectWS();\r\n}\r\nfunction connectWS() {\r\n  manualClose = false;\r\n  if (ws) { ws.onclose = null; ws.close(); }\r\n  // Guard: reject literal \"undefined\"/null/empty tokens (old localStorage pollution)\r\n  if (!token || token === 'undefined' || token === 'null' || token === '') {\r\n    doLogout(); return;\r\n  }\r\n  const fullUrl = 'wss://' + location.host + '/chat?token=' + encodeURIComponent(token);\r\n  ws = new WebSocket(fullUrl);\r\n  ws.onopen = () => {\r\n    reconnectAttempts = 0;\r\n    updateConnDot('\\uD83D\\uDFE2');\r\n    updateMyName();\r\n  };\r\n  ws.onmessage = evt => { try { handleWSMessage(JSON.parse(evt.data)); } catch(e) {} };\r\n  ws.onclose = () => { if (!manualClose) scheduleReconnect(); updateConnDot('\\uD83D\\uDD34'); const mi = document.getElementById('msgInput'); if (mi) mi.disabled = true; };\r\n  ws.onerror = () => { updateConnDot('\\uD83D\\uDD34'); };\r\n}\r\nfunction updateConnDot(color) {\r\n  const dot = document.getElementById('connDot');\r\n  if (dot) dot.textContent = color === '\\uD83D\\uDFE2' ? '\\uD83D\\uDFE2' : color === '\\uD83D\\uDFE1' ? '\\uD83D\\uDFE1' : '\\uD83D\\uDD34';\r\n}\r\nfunction scheduleReconnect() {\r\n  if (manualClose) return;\r\n  clearTimeout(reconnectTimer);\r\n  const delay = reconnectAttempts < 3 ? 1500 : Math.min(15000, 3000 * Math.pow(1.5, reconnectAttempts - 3));\r\n  reconnectAttempts++;\r\n  reconnectTimer = setTimeout(connectWS, delay);\r\n}\r\nfunction handleWSMessage(msg) {\r\n  if (msg.type === 'init') {\r\n    geo = msg.geo || '';\r\n    document.getElementById('msgInput').disabled = false;\r\n    msg.messages && msg.messages.forEach(m => addMessage(m));\r\n    msg.online && msg.online.forEach(u => addOnlineUser(u));\r\n    updateQuotaBadge();\r\n    updateMyName();\r\n  } else if (msg.type === 'message') {\r\n    addMessage({...msg, direction: msg.username === username ? 'outgoing' : 'incoming'});\r\n    if (msg.username !== username) playMsgSound();\r\n  } else if (msg.type === 'online') {\r\n    addOnlineUser({username:msg.username, geo:msg.geo});\r\n    addSystem(msg.username + ' joined');\r\n    if (msg.username !== username) playNotifSound();\r\n  } else if (msg.type === 'offline') {\r\n    removeMember(msg.username);\r\n    addSystem(msg.username + ' left');\r\n  } else if (msg.type === 'private') {\r\n    addMessage({...msg, direction: msg.from === username ? 'outgoing' : 'incoming', private:true});\r\n    playNotifSound();\r\n  } else if (msg.type === 'quota') {\r\n    const wasLimited = quota > 0;\r\n    quota = msg.quota;\r\n    updateQuotaBadge();\r\n    if (payPollTimer) { clearInterval(payPollTimer); payPollTimer = null; }\r\n    if (quota < 0 && wasLimited) addSystem(t('buySuccess'));\r\n  } else if (msg.type === 'system') {\r\n    if (msg.code === 'QUOTA_EXHAUSTED') { openBuy(); }\r\n    addSystem(msg.text || '');\r\n  } else if (msg.type === 'random_waiting') {\r\n    randomFinding = true; randomPeer = null;\r\n    document.getElementById('randomBanner').style.display = '';\r\n    document.getElementById('randomStatus').textContent = t('randomFinding');\r\n    document.getElementById('btnRandom').classList.add('active');\r\n  } else if (msg.type === 'random_paired') {\r\n    randomFinding = false; randomPeer = msg.peer; randomTo = msg.peer;\r\n    document.getElementById('randomBanner').style.display = '';\r\n    document.getElementById('randomStatus').textContent = t('randomPaired');\r\n    document.getElementById('btnRandom').classList.add('active');\r\n  } else if (msg.type === 'random_msg') {\r\n    addMessage({from:msg.from, geo:msg.geo, text:msg.text, direction: msg.from === username ? 'outgoing' : 'incoming', private:true});\r\n  } else if (msg.type === 'random_peer_left') {\r\n    randomPeer = null; randomFinding = false;\r\n    document.getElementById('randomBanner').style.display = 'none';\r\n    document.getElementById('btnRandom').classList.remove('active');\r\n    addSystem(t('randomLeft'));\r\n  }\r\n}\r\nlet lastMembers = [];\r\nfunction addOnlineUser(u) {\r\n  if (typeof u === 'object') { lastMembers.push(u.username); } else { lastMembers.push(u); }\r\n  renderMembers(lastMembers);\r\n}\r\nfunction removeMember(u) {\r\n  lastMembers = lastMembers.filter(m => m !== u);\r\n  renderMembers(lastMembers);\r\n}\r\nfunction renderMembers(members) {\r\n  lastMembers = members || lastMembers || [];\r\n  const sel = document.getElementById('privateTo');\r\n  if (!sel) return;\r\n  sel.innerHTML = '<option value=\"\" id=\"optPublic\">' + t('selectPrivate') + '</option>';\r\n  if (username) {\r\n    const oMe = document.createElement('option'); oMe.value = ''; oMe.textContent = username + ' ' + (t('meLabel') || '(me)'); oMe.disabled = true; sel.appendChild(oMe);\r\n  }\r\n  members.forEach(m => {\r\n    const nm = typeof m === 'object' ? m.username : m;\r\n    if (nm && nm !== username) {\r\n      const o = document.createElement('option'); o.value = nm; o.textContent = '\\u2709 ' + nm; sel.appendChild(o);\r\n    }\r\n  });\r\n}\r\nfunction onSelectChange() {\r\n  const sel = document.getElementById('privateTo');\r\n  if (!sel) return;\r\n  privateTo = sel.value;\r\n  const dm = document.getElementById('privateMode');\r\n  const dmInp = document.getElementById('dmInput');\r\n  if (privateTo) {\r\n    if (dm) { dm.style.display = ''; dm.textContent = 'DM: ' + privateTo; }\r\n    if (dmInp) dmInp.style.display = 'none';\r\n  } else {\r\n    if (dm) { dm.style.display = 'none'; }\r\n    if (dmInp) dmInp.style.display = '';\r\n  }\r\n}\r\nfunction onSelectChangeReset() { onSelectChange(); }\r\nfunction applyDmInput() {\r\n  const inp = document.getElementById('dmInput');\r\n  if (!inp) return;\r\n  const v = inp.value.trim();\r\n  if (!v) return;\r\n  privateTo = v;\r\n  const dm = document.getElementById('privateMode');\r\n  if (dm) { dm.style.display = ''; dm.textContent = 'DM: ' + privateTo; }\r\n  inp.value = '';\r\n  inp.style.display = 'none';\r\n  const sel = document.getElementById('privateTo');\r\n  if (sel) { sel.value = privateTo; }\r\n}\r\nfunction updateQuotaBadge() {\r\n  const el = document.getElementById('quotaBadge');\r\n  if (!el) return;\r\n  if (quota < 0) { el.textContent = '\\u221E'; el.title = t('quotaUnlimited') || 'Unlimited'; }\r\n  else { el.textContent = quota; el.title = (t('quotaRemaining') || 'Messages left') + ': ' + quota; }\r\n  el.style.display = '';\r\n  el.style.cursor = 'pointer';\r\n  el.onclick = () => { if (username) openBuy(); };\r\n}\r\nfunction toggleEmojiPanel() {\r\n  const p = document.getElementById('emojiPanel');\r\n  if (!p.classList.contains('open')) {\r\n    p.classList.add('open');\r\n    renderEmojiGrid();\r\n  } else {\r\n    p.classList.remove('open');\r\n  }\r\n}\r\n\r\nvar pendingEmoji = null;\r\nvar pendingEmojiTitle = null;\r\nfunction pickEmoji(svgStr, title) {\r\n  pendingEmoji = svgStr;\r\n  pendingEmojiTitle = title;\r\n  var inp = document.getElementById('msgInput');\r\n  if (inp) { inp.placeholder = '\\u270B ' + title; inp.focus(); }\r\n}\r\nfunction insertEmoji(code) {\r\n  var inp = document.getElementById('msgInput');\r\n  if (inp) { inp.placeholder = ''; }\r\n  pendingEmoji = null; pendingEmojiTitle = null;\r\n}\r\ndocument.addEventListener('click', function(e) {\r\n  var panel = document.getElementById('emojiPanel');\r\n  var btn = document.getElementById('emojiBtn');\r\n  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {\r\n    panel.classList.remove('open');\r\n  }\r\n});\r\nfunction renderEmojiGrid() {\r\n  var g = document.getElementById('emojiGrid');\r\n  if (!g || g.children.length > 0) return;\r\n  var emojis = [\r\n    // 1. Burger Shopping - 汉堡戴墨镜逛街\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"4\" y=\"22\" width=\"28\" height=\"8\" rx=\"3\" fill=\"#E8A020\"/><rect x=\"6\" y=\"20\" width=\"24\" height=\"3\" rx=\"1\" fill=\"#5D9C3F\"/><ellipse cx=\"18\" cy=\"18\" rx=\"12\" ry=\"4\" fill=\"#FFEFD5\"/><rect x=\"4\" y=\"10\" width=\"28\" height=\"5\" rx=\"2\" fill=\"#E8A020\"/><ellipse cx=\"18\" cy=\"9\" rx=\"12\" ry=\"4\" fill=\"#F4C430\"/><ellipse cx=\"10\" cy=\"9\" rx=\"5\" ry=\"3\" fill=\"#E8A020\"/><circle cx=\"12\" cy=\"6\" r=\"4\" fill=\"#333\"/><circle cx=\"24\" cy=\"6\" r=\"4\" fill=\"#333\"/><circle cx=\"12\" cy=\"5\" r=\"2\" fill=\"#666\"/><circle cx=\"24\" cy=\"5\" r=\"2\" fill=\"#666\"/><line x1=\"4\" y1=\"9\" x2=\"7\" y2=\"7\" stroke=\"#333\" stroke-width=\"2\"/><line x1=\"32\" y1=\"9\" x2=\"29\" y2=\"7\" stroke=\"#333\" stroke-width=\"2\"/><line x1=\"4\" y1=\"27\" x2=\"4\" y2=\"33\" stroke=\"#E8A020\" stroke-width=\"3\"/><line x1=\"32\" y1=\"27\" x2=\"32\" y2=\"33\" stroke=\"#E8A020\" stroke-width=\"3\"/><line x1=\"10\" y1=\"30\" x2=\"8\" y2=\"34\" stroke=\"#E8A020\" stroke-width=\"3\"/><line x1=\"26\" y1=\"30\" x2=\"28\" y2=\"34\" stroke=\"#E8A020\" stroke-width=\"3\"/></svg>', t:'Burger Shopping'},\r\n\r\n    // 2. Octopus Noodles - 章鱼炒面\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><ellipse cx=\"18\" cy=\"12\" rx=\"9\" ry=\"7\" fill=\"#E74C3C\"/><circle cx=\"14\" cy=\"11\" r=\"2.5\" fill=\"#fff\"/><circle cx=\"22\" cy=\"11\" r=\"2.5\" fill=\"#fff\"/><circle cx=\"14\" cy=\"11\" r=\"1.2\" fill=\"#333\"/><circle cx=\"22\" cy=\"11\" r=\"1.2\" fill=\"#333\"/><path d=\"M15 15 Q18 17 21 15\" stroke=\"#333\" stroke-width=\"1.5\" fill=\"none\"/><line x1=\"10\" y1=\"18\" x2=\"8\" y2=\"23\" stroke=\"#E74C3C\" stroke-width=\"3\" stroke-linecap=\"round\"/><line x1=\"14\" y1=\"18\" x2=\"13\" y2=\"24\" stroke=\"#E74C3C\" stroke-width=\"3\" stroke-linecap=\"round\"/><line x1=\"18\" y1=\"19\" x2=\"18\" y2=\"25\" stroke=\"#E74C3C\" stroke-width=\"3\" stroke-linecap=\"round\"/><line x1=\"22\" y1=\"18\" x2=\"23\" y2=\"24\" stroke=\"#E74C3C\" stroke-width=\"3\" stroke-linecap=\"round\"/><line x1=\"26\" y1=\"18\" x2=\"28\" y2=\"23\" stroke=\"#E74C3C\" stroke-width=\"3\" stroke-linecap=\"round\"/><line x1=\"8\" y1=\"24\" x2=\"10\" y2=\"26\" stroke=\"#E74C3C\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"13\" y1=\"25\" x2=\"11\" y2=\"27\" stroke=\"#E74C3C\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"23\" y1=\"25\" x2=\"25\" y2=\"27\" stroke=\"#E74C3C\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"28\" y1=\"24\" x2=\"26\" y2=\"26\" stroke=\"#E74C3C\" stroke-width=\"2\" stroke-linecap=\"round\"/><rect x=\"3\" y=\"29\" width=\"30\" height=\"4\" rx=\"2\" fill=\"#F4D03F\"/><path d=\"M5 29 Q8 26 11 29 Q14 32 17 29 Q20 26 23 29 Q26 32 29 29\" stroke=\"#F4D03F\" stroke-width=\"2\" fill=\"none\"/></svg>', t:'Octopus Noodles'},\r\n\r\n    // 3. Pineapple Vacation - 菠萝度假\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><ellipse cx=\"18\" cy=\"21\" rx=\"9\" ry=\"11\" fill=\"#F4D03F\"/><path d=\"M9 18 L9 28 M13 16 L13 29 M17 15 L17 30 M21 15 L21 30 M25 16 L25 29 M27 18 L27 28\" stroke=\"#E8A020\" stroke-width=\"1.5\"/><path d=\"M9 18 Q18 21 27 18 M9 22 Q18 25 27 22 M9 26 Q18 29 27 26\" stroke=\"#E8A020\" stroke-width=\"1.5\" fill=\"none\"/><path d=\"M14 10 Q18 2 22 10 Q25 4 26 10 Q28 5 27 11 Q30 8 28 13\" stroke=\"#27AE60\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"12\" cy=\"21\" r=\"3.5\" fill=\"#333\"/><circle cx=\"24\" cy=\"21\" r=\"3.5\" fill=\"#333\"/><circle cx=\"13\" cy=\"20\" r=\"1.5\" fill=\"#666\"/><circle cx=\"25\" cy=\"20\" r=\"1.5\" fill=\"#666\"/><path d=\"M13 27 Q18 31 23 27\" stroke=\"#333\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M5 14 Q7 10 10 14\" stroke=\"#27AE60\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M26 14 Q29 10 31 14\" stroke=\"#27AE60\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/></svg>', t:'Pineapple Vacation'},\r\n\r\n    // 4. Crying Cloud - 哭泣云\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><ellipse cx=\"22\" cy=\"14\" rx=\"9\" ry=\"7\" fill=\"#D5E8F5\"/><circle cx=\"14\" cy=\"16\" r=\"5\" fill=\"#D5E8F5\"/><circle cx=\"18\" cy=\"12\" r=\"6\" fill=\"#D5E8F5\"/><circle cx=\"26\" cy=\"15\" r=\"4\" fill=\"#D5E8F5\"/><circle cx=\"13\" cy=\"13\" r=\"2\" fill=\"#333\"/><circle cx=\"17\" cy=\"13\" r=\"2\" fill=\"#333\"/><circle cx=\"13\" cy=\"12.5\" r=\"0.8\" fill=\"#fff\"/><circle cx=\"17\" cy=\"12.5\" r=\"0.8\" fill=\"#fff\"/><path d=\"M13 17 Q15 15.5 17 17\" stroke=\"#333\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/><ellipse cx=\"11\" cy=\"18\" rx=\"1.5\" ry=\"2.5\" fill=\"#5DADE2\"/><ellipse cx=\"16\" cy=\"20\" rx=\"1\" ry=\"2\" fill=\"#5DADE2\"/><path d=\"M8 21 Q9 24 11 21 Q13 24 14 21\" stroke=\"#5DADE2\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M3 22 Q5 26 7 22 Q9 26 11 22\" stroke=\"#5DADE2\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/></svg>', t:'Crying Cloud'},\r\n\r\n    // 5. Angry Cloud - 愤怒云\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><ellipse cx=\"22\" cy=\"14\" rx=\"9\" ry=\"7\" fill=\"#95A5A6\"/><circle cx=\"14\" cy=\"16\" r=\"5\" fill=\"#95A5A6\"/><circle cx=\"18\" cy=\"12\" r=\"6\" fill=\"#95A5A6\"/><circle cx=\"26\" cy=\"15\" r=\"4\" fill=\"#95A5A6\"/><line x1=\"10\" y1=\"12\" x2=\"14\" y2=\"14\" stroke=\"#333\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"22\" y1=\"12\" x2=\"26\" y2=\"14\" stroke=\"#333\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><circle cx=\"12\" cy=\"15\" r=\"2\" fill=\"#333\"/><circle cx=\"18\" cy=\"15\" r=\"2\" fill=\"#333\"/><path d=\"M12 19 Q15 17 18 19\" stroke=\"#333\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/><line x1=\"6\" y1=\"22\" x2=\"10\" y2=\"28\" stroke=\"#F1C40F\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"6\" y1=\"28\" x2=\"10\" y2=\"22\" stroke=\"#F1C40F\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"10\" y1=\"24\" x2=\"12\" y2=\"26\" stroke=\"#F1C40F\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"28\" y1=\"22\" x2=\"32\" y2=\"28\" stroke=\"#F1C40F\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"28\" y1=\"28\" x2=\"32\" y2=\"22\" stroke=\"#F1C40F\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"30\" y1=\"24\" x2=\"28\" y2=\"26\" stroke=\"#F1C40F\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"13\" y1=\"24\" x2=\"14\" y2=\"30\" stroke=\"#F1C40F\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"13\" y1=\"30\" x2=\"14\" y2=\"24\" stroke=\"#F1C40F\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg>', t:'Angry Cloud'},\r\n\r\n    // 6. Sleeping Sun - 太阳睡觉\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><line x1=\"4\" y1=\"12\" x2=\"9\" y2=\"12\" stroke=\"#F39C12\" stroke-width=\"3\" stroke-linecap=\"round\"/><line x1=\"27\" y1=\"12\" x2=\"32\" y2=\"12\" stroke=\"#F39C12\" stroke-width=\"3\" stroke-linecap=\"round\"/><line x1=\"18\" y1=\"2\" x2=\"18\" y2=\"6\" stroke=\"#F39C12\" stroke-width=\"3\" stroke-linecap=\"round\"/><line x1=\"8\" y1=\"5\" x2=\"11\" y2=\"8\" stroke=\"#F39C12\" stroke-width=\"3\" stroke-linecap=\"round\"/><line x1=\"25\" y1=\"5\" x2=\"28\" y2=\"8\" stroke=\"#F39C12\" stroke-width=\"3\" stroke-linecap=\"round\"/><circle cx=\"18\" cy=\"18\" r=\"11\" fill=\"#F4D03F\"/><path d=\"M11 17 Q13 14 15 17\" stroke=\"#333\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M21 17 Q23 14 25 17\" stroke=\"#333\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M13 22 Q18 19 23 22\" stroke=\"#333\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M14 23 Q18 25 22 23\" stroke=\"#333\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M3 27 Q5 24 7 27\" stroke=\"#7F8C8D\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M4 30 Q6 27 8 30\" stroke=\"#7F8C8D\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M2 33 Q4 30 6 33\" stroke=\"#7F8C8D\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/><rect x=\"28\" y=\"20\" width=\"5\" height=\"7\" rx=\"1\" fill=\"#95A5A6\"/><line x1=\"29\" y1=\"22\" x2=\"29\" y2=\"26\" stroke=\"#F39C12\" stroke-width=\"1.5\"/><line x1=\"30.5\" y1=\"22\" x2=\"30.5\" y2=\"26\" stroke=\"#F39C12\" stroke-width=\"1.5\"/><circle cx=\"30.5\" cy=\"19\" r=\"1.5\" fill=\"#E74C3C\"/></svg>', t:'Sleeping Sun'},\r\n\r\n    // 7. Moon Eating Star - 月亮偷吃星\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"18\" cy=\"18\" r=\"12\" fill=\"#F5F5DC\"/><circle cx=\"10\" cy=\"10\" r=\"9\" fill=\"#1a1a2e\"/><circle cx=\"14\" cy=\"15\" r=\"2\" fill=\"#333\"/><circle cx=\"15\" cy=\"14.5\" r=\"0.8\" fill=\"#fff\"/><path d=\"M11 19 Q14 17 17 19\" stroke=\"#333\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M21 11 L23 8 L25 12 L22 14 L25 16 L23 20 L21 17 L18 20 L16 16 L13 18 L15 14 L12 12 L15 8 Z\" fill=\"#F4D03F\" stroke=\"#F39C12\" stroke-width=\"0.5\"/><circle cx=\"20\" cy=\"12\" r=\"1.5\" fill=\"#E74C3C\"/><circle cx=\"19\" cy=\"12\" r=\"0.6\" fill=\"#F4D03F\"/><path d=\"M22 9 Q24 7 25 9\" stroke=\"#E74C3C\" stroke-width=\"1\" fill=\"none\"/></svg>', t:'Moon Eating Star'},\r\n\r\n    // 8. Crystal Ball Prophecy - 预言水晶球\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"10\" y=\"27\" width=\"16\" height=\"6\" rx=\"2\" fill=\"#8B4513\"/><rect x=\"12\" y=\"23\" width=\"12\" height=\"5\" rx=\"1\" fill=\"#A0522D\"/><circle cx=\"18\" cy=\"15\" r=\"11\" fill=\"#C8E6F5\" opacity=\"0.7\"/><circle cx=\"18\" cy=\"15\" r=\"11\" fill=\"none\" stroke=\"#B0D4F1\" stroke-width=\"2\"/><circle cx=\"14\" cy=\"11\" r=\"3\" fill=\"#fff\" opacity=\".5\"/><circle cx=\"20\" cy=\"17\" r=\"4\" fill=\"#8B4513\"/><circle cx=\"20\" cy=\"17\" r=\"3\" fill=\"#A0522D\"/><circle cx=\"19\" cy=\"16\" r=\"1\" fill=\"#5D3A1A\"/><circle cx=\"21\" cy=\"18\" r=\"1\" fill=\"#5D3A1A\"/><path d=\"M18 20 Q19 21 20 20\" stroke=\"#333\" stroke-width=\"1\" fill=\"none\"/></svg>', t:'Crystal Ball Prophecy'},\r\n\r\n    // 9. Ghost Selfie - 自拍幽灵\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M8 30 Q8 12 18 10 Q28 12 28 30 Q26 27 24 30 Q22 27 20 30 Q18 27 16 30 Q14 27 12 30 Q10 27 8 30\" fill=\"#ECF0F1\" opacity=\"0.9\"/><circle cx=\"14\" cy=\"18\" r=\"2.5\" fill=\"#333\"/><circle cx=\"22\" cy=\"18\" r=\"2.5\" fill=\"#333\"/><circle cx=\"14.5\" cy=\"17.5\" r=\"0.8\" fill=\"#fff\"/><circle cx=\"22.5\" cy=\"17.5\" r=\"0.8\" fill=\"#fff\"/><ellipse cx=\"18\" cy=\"23\" rx=\"3\" ry=\"2\" fill=\"#333\"/><rect x=\"25\" y=\"12\" width=\"3\" height=\"8\" rx=\"1\" fill=\"#BDC3C7\" transform=\"rotate(25,26,16)\"/><rect x=\"26\" y=\"10\" width=\"6\" height=\"4\" rx=\"1\" fill=\"#333\" transform=\"rotate(25,26,16)\"/></svg>', t:'Ghost Selfie'},\r\n\r\n    // 10. Rainbow Chicken - 彩虹小鸡\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><ellipse cx=\"18\" cy=\"22\" rx=\"11\" ry=\"10\" fill=\"#F4D03F\"/><circle cx=\"18\" cy=\"14\" r=\"8\" fill=\"#F4D03F\"/><path d=\"M15 7 Q18 4 21 7 Q18 5 15 7\" fill=\"#E74C3C\"/><circle cx=\"15\" cy=\"13\" r=\"2\" fill=\"#333\"/><circle cx=\"21\" cy=\"13\" r=\"2\" fill=\"#333\"/><circle cx=\"15.5\" cy=\"12.5\" r=\"0.7\" fill=\"#fff\"/><circle cx=\"21.5\" cy=\"12.5\" r=\"0.7\" fill=\"#fff\"/><path d=\"M16 17 L18 19 L20 17\" fill=\"#F39C12\"/><ellipse cx=\"10\" cy=\"22\" rx=\"4\" ry=\"3\" fill=\"#27AE60\" opacity=\".6\"/><ellipse cx=\"26\" cy=\"22\" rx=\"4\" ry=\"3\" fill=\"#3498DB\" opacity=\".6\"/><ellipse cx=\"18\" cy=\"29\" rx=\"3\" ry=\"2\" fill=\"#F39C12\"/><line x1=\"16\" y1=\"32\" x2=\"15\" y2=\"35\" stroke=\"#F39C12\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"20\" y1=\"32\" x2=\"21\" y2=\"35\" stroke=\"#F39C12\" stroke-width=\"2.5\" stroke-linecap=\"round\"/></svg>', t:'Rainbow Chicken'},\r\n\r\n    // 11. Stressed Waffle - 华夫饼急了\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"5\" y=\"13\" width=\"26\" height=\"18\" rx=\"3\" fill=\"#D4A24E\"/><path d=\"M5 18 L31 18 M5 23 L31 23 M5 28 L31 28 M11 13 L11 31 M17 13 L17 31 M23 13 L23 31\" stroke=\"#C1923A\" stroke-width=\"1.5\"/><rect x=\"5\" y=\"13\" width=\"26\" height=\"4\" rx=\"2\" fill=\"#E8B85A\"/><line x1=\"12\" y1=\"10\" x2=\"14\" y2=\"6\" stroke=\"#E74C3C\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"18\" y1=\"8\" x2=\"18\" y2=\"4\" stroke=\"#E74C3C\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"24\" y1=\"10\" x2=\"22\" y2=\"6\" stroke=\"#E74C3C\" stroke-width=\"2\" stroke-linecap=\"round\"/><line x1=\"10\" y1=\"7\" x2=\"12\" y2=\"9\" stroke=\"#E74C3C\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><line x1=\"24\" y1=\"7\" x2=\"22\" y2=\"9\" stroke=\"#E74C3C\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><circle cx=\"13\" cy=\"20\" r=\"2.5\" fill=\"#333\"/><circle cx=\"23\" cy=\"20\" r=\"2.5\" fill=\"#333\"/><circle cx=\"13.5\" cy=\"19.5\" r=\"0.8\" fill=\"#E74C3C\"/><circle cx=\"23.5\" cy=\"19.5\" r=\"0.8\" fill=\"#E74C3C\"/><path d=\"M13 26 Q18 23 23 26\" stroke=\"#333\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/></svg>', t:'Stressed Waffle'},\r\n\r\n    // 12. WiFi Love - WiFi恋爱\r\n    {s:'<svg class=\"chat-emoji\" viewBox=\"0 0 36 36\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"16\" y=\"22\" width=\"4\" height=\"8\" rx=\"1\" fill=\"#555\"/><path d=\"M14 22 A8 8 0 0 1 22 22\" stroke=\"#555\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M10 17 A13 13 0 0 1 26 17\" stroke=\"#555\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M6 12 A18 18 0 0 1 30 12\" stroke=\"#555\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"18\" cy=\"25\" r=\"1.5\" fill=\"#E74C3C\"/><path d=\"M11 29 Q13 26 15 29 Q17 32 19 29 Q21 26 23 29 Q25 32 27 29 Q29 26 30 29\" stroke=\"#E74C3C\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M8 26 Q10 23 12 26 Q14 29 16 26 Q18 23 20 26 Q22 29 24 26 Q26 23 28 26\" stroke=\"#E91E63\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\" opacity=\".7\"/><path d=\"M4 22 Q7 18 10 22 Q13 26 16 22 Q19 18 22 22 Q25 26 28 22 Q31 18 34 22\" stroke=\"#E91E63\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\" opacity=\".4\"/><path d=\"M6 18 Q9 14 12 18 Q15 22 18 18 Q21 14 24 18 Q27 22 30 18\" stroke=\"#E91E63\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\" opacity=\".4\"/></svg>', t:'WiFi Love'},\r\n  ];\r\n  emojis.forEach(function(e) {\r\n    var item = document.createElement('div');\r\n    item.className = 'emoji-item';\r\n    item.innerHTML = e.s;\r\n    item.title = e.t;\r\n    item.onclick = function() {\r\n      pickEmoji(e.s, e.t);\r\n      var panel = document.getElementById('emojiPanel');\r\n      if (panel) panel.classList.remove('open');\r\n    };\r\n    g.appendChild(item);\r\n  });\r\n}\r\n\r\n\r\nfunction updateMyName() {\r\n  const el = document.getElementById('myName');\r\n  if (el) el.textContent = username ? (t('meLabel') || '(me)') + ' ' + username : '';\r\n}\r\nfunction refreshChatI18n() {\r\n  renderMembers(lastMembers);\r\n  if (privateTo) { const h = document.getElementById('privateMode'); if (h) h.textContent = 'DM: ' + privateTo; }\r\n  if (document.getElementById('randomBanner').style.display !== 'none') {\r\n    const s = document.getElementById('randomStatus');\r\n    if (s) s.textContent = randomPeer ? t('randomPaired') : t('randomFinding');\r\n  }\r\n}\r\nfunction fmtTime(ms) {\r\n  const d = new Date(ms);\r\n  const p = n => (n < 10 ? '0' + n : '' + n);\r\n  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());\r\n}\r\nfunction addMessage(msg) {\r\n  const area = document.getElementById('msgArea');\r\n  if (!area) return;\r\n  const div = document.createElement('div');\r\n  let cls = 'msg';\r\n  if (msg.private) cls += ' private';\r\n  else if (msg.direction === 'outgoing') cls += ' outgoing';\r\n  else if (msg.direction === 'incoming') cls += ' incoming';\r\n  if (msg.type === 'system') cls = 'msg system';\r\n  div.className = cls;\r\n  if (msg.type === 'system') {\r\n    if (msg.emojiSvg) {\r\n      var ei = document.createElement('img');\r\n      ei.src = 'data:image/svg+xml,' + encodeURIComponent(msg.emojiSvg);\r\n      ei.style = 'max-width:72px;max-height:72px;border-radius:8px;display:block;margin:2px auto';\r\n      ei.title = msg.emojiTitle || '';\r\n      div.style.textAlign = 'center';\r\n      div.appendChild(ei);\r\n      if (msg.text) {\r\n        var sp = document.createElement('span');\r\n        sp.textContent = msg.text;\r\n        sp.style.display = 'block';\r\n        div.appendChild(sp);\r\n      }\r\n    } else {\r\n      div.textContent = msg.text || '';\r\n    }\r\n  } else {\r\n    if (msg.emojiSvg) {\r\n      var ei = document.createElement('img');\r\n      ei.src = 'data:image/svg+xml,' + encodeURIComponent(msg.emojiSvg);\r\n      ei.style = 'max-width:72px;max-height:72px;border-radius:8px;display:block;margin:2px auto';\r\n      ei.title = msg.emojiTitle || '';\r\n      div.style.textAlign = 'center';\r\n      div.appendChild(ei);\r\n    }\r\n    const from = esc(msg.from || msg.username || '?');\r\n    const geoTxt = msg.geo ? ' <span class=\"geo\">(' + esc(msg.geo) + ')</span>' : '';\r\n    const lock = msg.private ? ' &#128274;' : '';\r\n    const tsVal = msg.ts || msg.timestamp;\r\n    const ts = tsVal ? '<span class=\"ts\">' + fmtTime(tsVal) + '</span>' : '';\r\n    div.innerHTML = '<div class=\"uname\">' + from + geoTxt + lock + '</div><div>' + esc(msg.text || '') + '</div>' + ts;\r\n  }\r\n  area.appendChild(div);\r\n  area.scrollTop = area.scrollHeight;\r\n}\r\nfunction addSystem(text) { addMessage({type:'system', text}); }\r\nfunction sendMsg() {\r\n  const inp = document.getElementById('msgInput');\r\n  if (!inp || inp.disabled) return;\r\n  const text = inp.value.trim();\r\n  if (!text) return;\r\n  inp.value = '';\r\n  if (quota === 0) { openBuy(); return; }\r\n  if (quota > 0) quota--;\r\n  updateQuotaBadge();\r\n  var msg = { type: 'message', text: text || '', ts: Date.now(), geo };\r\n  if (pendingEmoji) {\r\n    msg.emojiSvg = pendingEmoji;\r\n    msg.emojiTitle = pendingEmojiTitle || '';\r\n    msg.text = text || '';\r\n    pendingEmoji = null; pendingEmojiTitle = null;\r\n    var inpP = document.getElementById('msgInput');\r\n    if (inpP) inpP.placeholder = '';\r\n  }\r\n  if (randomPeer) {\r\n    msg.type = 'random_msg'; msg.to = randomPeer;\r\n  } else if (privateTo) {\r\n    msg.type = 'private'; msg.to = privateTo;\r\n  }\r\n  // No optimistic render: the server echoes every message to ALL sockets\r\n  // (direction outgoing/incoming), so all devices of the same account stay in sync.\r\n  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));\r\n}\r\nlet randomTo = '';\r\nfunction startRandom() {\r\n  if (!username || !token) { showLogin(); return; }\r\n  if (ws && ws.readyState === 1) {\r\n    ws.send(JSON.stringify({type:'random'}));\r\n  }\r\n}\r\nfunction nextRandom() {\r\n  if (ws && ws.readyState === 1) ws.send(JSON.stringify({type:'random_next'}));\r\n}\r\nfunction exitRandom() {\r\n  if (ws && ws.readyState === 1) ws.send(JSON.stringify({type:'random_leave'}));\r\n  randomPeer = null; randomFinding = false;\r\n  document.getElementById('randomBanner').style.display = 'none';\r\n  document.getElementById('btnRandom').classList.remove('active');\r\n}\r\nfunction openBuy() { document.getElementById('buyModal').classList.add('show'); loadPayConfig(); }\r\nfunction closeBuy() {\r\n  document.getElementById('buyModal').classList.remove('show');\r\n  clearInterval(wxPollTimer); clearInterval(pendingTimer);\r\n}\r\nfunction loadPayConfig() {\r\n  document.getElementById('buyQrArea').style.display = 'none';\r\n  document.getElementById('buyOptions').style.display = '';\r\n  document.getElementById('buyResult').style.display = 'none';\r\n  document.getElementById('buyCloseBtn').style.display = '';\r\n}\r\nasync function doBuy(pkg) {\r\n  if (payPollTimer) { clearInterval(payPollTimer); payPollTimer = null; }\r\n  clearInterval(wxPollTimer); clearInterval(pendingTimer);\r\n  document.getElementById('buyOptions').style.display = 'none';\r\n  const qrArea = document.getElementById('buyQrArea');\r\n  qrArea.style.display = '';\r\n  const tip = document.getElementById('buyQrTip');\r\n  const img = document.getElementById('buyQrImg');\r\n  const paidArea = document.getElementById('buyPaidBtnArea');\r\n  img.style.display = 'none'; paidArea.style.display = 'none';\r\n  tip.textContent = 'Processing...';\r\n  try {\r\n    const r = await api('/api/buy', {pkg, token});\r\n    const d = await r.json();\r\n    if (d.mock === false && d.code_url) {\r\n      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(d.code_url);\r\n      img.style.display = 'block';\r\n      tip.textContent = 'Scan with WeChat Pay';\r\n      paidArea.style.display = 'none';\r\n      wxPollTimer = setInterval(async () => {\r\n        const pr = await api('/api/wxpay/status', {out_trade_no:d.out_trade_no, token});\r\n        const pd = await pr.json();\r\n        if (pd.paid) {\r\n          clearInterval(wxPollTimer);\r\n          quota = -1; updateQuotaBadge();\r\n          document.getElementById('buyResultText').textContent = t('buySuccess');\r\n          document.getElementById('buyResult').style.display = '';\r\n          setTimeout(closeBuy, 1500);\r\n        }\r\n      }, 2000);\r\n    } else if (d.personal) {\r\n      if (d.wechatUrl) {\r\n        img.src = d.wechatUrl; img.style.display = 'block';\r\n        tip.textContent = 'WeChat Pay - scan or save';\r\n      } else if (d.alipayUrl) {\r\n        img.src = d.alipayUrl; img.style.display = 'block';\r\n        tip.textContent = 'Alipay - scan or save';\r\n      } else {\r\n        tip.textContent = 'QR code not configured yet.';\r\n      }\r\n      document.getElementById('buyUploadArea').style.display = '';\r\n      document.getElementById('buyPaidBtnArea').style.display = 'none';\r\n      const scr = document.getElementById('buyScreenshot');\r\n      scr.value = '';\r\n      const preview = document.getElementById('buyScreenshotPreview');\r\n      preview.src = ''; preview.style.display = 'none';\r\n      scr.onchange = () => {\r\n        const file = scr.files[0];\r\n        if (!file) return;\r\n        const reader = new FileReader();\r\n        reader.onload = e => {\r\n          preview.src = e.target.result; preview.style.display = 'block';\r\n          document.getElementById('buyPaidBtnArea').style.display = '';\r\n        };\r\n        reader.readAsDataURL(file);\r\n      };\r\n    } else {\r\n      // No payment configured - show error instead of giving free quota\r\n      tip.textContent = 'Payment not configured. Contact admin.';\r\n      qrArea.style.display = 'none';\r\n      document.getElementById('buyOptions').style.display = '';\r\n    }\r\n  } catch(e) { tip.textContent = 'Error: ' + e.message; }\r\n}\r\nasync function confirmPaid(pkg) {\r\n  const scr = document.getElementById('buyScreenshot');\r\n  const file = scr && scr.files[0];\r\n  const screenshot = file ? await new Promise(resolve => {\r\n    const r = new FileReader(); r.onload = e => resolve(e.target.result); r.readAsDataURL(file);\r\n  }) : '';\r\n  try {\r\n    const r = await api('/api/pay-confirm', {pkg, token, screenshot});\r\n    const d = await r.json();\r\n    closeBuy();\r\n    if (d.quota < 0 || d.approved) {\r\n      quota = -1; updateQuotaBadge();\r\n      addSystem(t('buySuccess'));\r\n    } else {\r\n      startPayPoll();\r\n      addSystem(t('buyWaiting'));\r\n    }\r\n  } catch(e) {}\r\n}\r\nfunction startPayPoll() {\r\n  if (payPollTimer) return; // already polling\r\n  payPollTimer = setInterval(async () => {\r\n    try {\r\n      const pr = await api('/api/pay-pending', {token});\r\n      const pd = await pr.json();\r\n      if (pd.approved || pd.quota < 0) {\r\n        clearInterval(payPollTimer); payPollTimer = null;\r\n        quota = -1; updateQuotaBadge();\r\n        addSystem(t('buySuccess'));\r\n      }\r\n    } catch(e) {}\r\n  }, 3000);\r\n}\r\nfunction doLogout() {\r\n  manualClose = true;\r\n  if (ws) { ws.onclose = null; ws.close(); ws = null; }\r\n  localStorage.removeItem('tinychat_token');\r\n  localStorage.removeItem('tinychat_username');\r\n  token = null; username = null; quota = 100;\r\n  privateTo = ''; randomPeer = null;\r\n  lastMembers = [];\r\n  document.getElementById('msgArea').innerHTML = '';\r\n  document.getElementById('msgInput').disabled = true;\r\n  updateMyName();\r\n  showLogin();\r\n}\r\n// Init\r\n(function init() {\r\n  token = localStorage.getItem('tinychat_token');\r\n  username = localStorage.getItem('tinychat_username');\r\n  lang = localStorage.getItem('tinychat_lang') || 'zh';\r\n  soundEnabled = localStorage.getItem('tinychat_sound') !== '0';\r\n  const sb = document.getElementById('soundBtn');\r\n  if (sb) sb.innerHTML = soundEnabled ? '\\uD83D\\uDD0A' : '\\uD83D\\uDD07';\r\n  // Sanitize localStorage pollution from old buggy versions\r\n  if (token === 'undefined' || token === 'null' || token === '') {\r\n    localStorage.removeItem('tinychat_token'); localStorage.removeItem('tinychat_username');\r\n    token = null; username = null;\r\n  }\r\n  applyI18n();\r\n  if (token && username) { showPage('Chat'); connectWS(); }\r\n  else { showLogin(); }\r\n  document.getElementById('msgInput').disabled = true;\r\n})();\r\n<\/script>\r\n</body>\r\n</html>";
const ADMIN_HTML = "<!DOCTYPE html>\r\n<html lang=\"zh-CN\">\r\n<head>\r\n<meta charset=\"UTF-8\">\r\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\">\r\n<title>ugochat Admin</title>\r\n<style>\r\n*{margin:0;padding:0;box-sizing:border-box}\r\nbody{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;min-height:100vh;display:flex;justify-content:center;align-items:flex-start;padding:20px}\r\n.wrap{width:100%;max-width:1100px}\r\nh1{text-align:center;margin-bottom:20px;color:#333}\r\n.login-box{background:#fff;padding:32px;border-radius:12px;max-width:400px;margin:60px auto;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08)}\r\n.login-box input{padding:10px 14px;border:1px solid #ddd;border-radius:8px;width:100%;font-size:15px;margin-bottom:10px}\r\n.login-box button{background:#1a73e8;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;width:100%;font-size:15px}\r\n.panel{background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.08)}\r\n.panel h2{margin-bottom:16px;color:#333;font-size:16px;border-bottom:1px solid #eee;padding-bottom:10px}\r\n.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px}\r\n.stat{background:#f8f9fa;padding:14px;border-radius:8px;text-align:center}\r\n.stat .n{font-size:24px;font-weight:700;color:#1a73e8}\r\n.stat .l{font-size:12px;color:#666;margin-top:4px}\r\n.toolbar{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center}\r\n.toolbar input{padding:7px 10px;border:1px solid #ddd;border-radius:6px;flex:1;min-width:150px}\r\n.toolbar select{padding:7px 10px;border:1px solid #ddd;border-radius:6px}\r\n.toolbar button{padding:7px 14px;background:#1a73e8;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}\r\n.toolbar button.danger{background:#d32f2f}\r\n.toolbar button.secondary{background:#666}\r\ntable{width:100%;border-collapse:collapse;font-size:13px}\r\nth,td{padding:8px 10px;text-align:left;border-bottom:1px solid #eee}\r\nth{background:#f8f9fa;font-weight:600;color:#333;position:sticky;top:0}\r\ntr:hover{background:#fafafa}\r\n.err{color:#d32f2f;margin-top:8px;font-size:14px;min-height:20px}\r\n.qr-section{margin-top:20px;padding-top:20px;border-top:1px solid #eee}\r\n.qr-section h3{font-size:14px;color:#333;margin-bottom:10px}\r\n.qr-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px}\r\n.qr-item{flex:1;min-width:200px;background:#f8f9fa;padding:12px;border-radius:8px}\r\n.qr-item label{font-size:13px;color:#666;display:block;margin-bottom:6px}\r\n.qr-item img{max-width:150px;display:block;margin-bottom:6px}\r\n.qr-item button{padding:4px 10px;background:#666;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px}\r\n.pending-section{margin-top:20px}\r\n#pendingArea .pend-item{display:flex;align-items:center;gap:10px;padding:10px;background:#fff8e1;border-radius:8px;margin-bottom:8px}\r\n#pendingArea .pend-item span{flex:1;font-size:13px}\r\n#pendingArea .pend-item button{padding:5px 12px;background:#4caf50;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px}\r\n.hidden{display:none}\r\n</style>\r\n</head>\r\n<body>\r\n<div class=\"wrap\">\r\n<div class=\"login-box\" id=\"loginBox\">\r\n<h1>&#128272; Admin</h1>\r\n<input id=\"adminPwd\" type=\"password\" placeholder=\"Password\" onkeydown=\"if(event.key==='Enter')doLogin()\">\r\n<button onclick=\"doLogin()\">Enter</button>\r\n<div class=\"err\" id=\"adminErr\"></div>\r\n</div>\r\n<div class=\"panel hidden\" id=\"panel\">\r\n<h2>&#128202; ugochat Statistics</h2>\r\n<div class=\"stats\">\r\n<div class=\"stat\"><div class=\"n\" id=\"stTotal\">-</div><div class=\"l\">Registered</div></div>\r\n<div class=\"stat\"><div class=\"n\" id=\"stOnline\">-</div><div class=\"l\">Online</div></div>\r\n<div class=\"stat\"><div class=\"n\" id=\"stEmail\">-</div><div class=\"l\">With Email</div></div>\r\n<div class=\"stat\"><div class=\"n\" id=\"stVisits\">-</div><div class=\"l\">Total Visits</div></div>\r\n<div class=\"stat\"><div class=\"n\" id=\"stToday\">-</div><div class=\"l\">Today</div></div>\r\n<div class=\"stat\"><div class=\"n\" id=\"stMsg\">-</div><div class=\"l\">Messages</div></div>\r\n<div class=\"stat\"><div class=\"n\" id=\"stReg\">-</div><div class=\"l\">Registers</div></div>\r\n<div class=\"stat\"><div class=\"n\" id=\"stLogin\">-</div><div class=\"l\">Logins</div></div>\r\n<div class=\"stat\"><div class=\"n\" id=\"stIP\">-</div><div class=\"l\">Unique IPs</div></div>\r\n</div>\r\n<div class=\"qr-section\">\r\n<h3>&#128179; Payment QR Codes</h3>\r\n<div class=\"qr-row\" id=\"qrRow\">\r\n<div class=\"qr-item\"><label>WeChat Pay</label><img id=\"qrWechat\" style=\"display:none\"><span id=\"qrWechatStatus\"></span><br><input type=\"file\" id=\"qrFileWechat\" accept=\"image/*\" style=\"display:none\"><button onclick=\"document.getElementById('qrFileWechat').click();document.getElementById('qrFileWechat').onchange=function(){uploadQR('wechat',this.files[0])}\">Upload</button></div>\r\n<div class=\"qr-item\"><label>Alipay</label><img id=\"qrAlipay\" style=\"display:none\"><span id=\"qrAlipayStatus\"></span><br><input type=\"file\" id=\"qrFileAlipay\" accept=\"image/*\" style=\"display:none\"><button onclick=\"document.getElementById('qrFileAlipay').click();document.getElementById('qrFileAlipay').onchange=function(){uploadQR('alipay',this.files[0])}\">Upload</button></div>\r\n</div>\r\n</div>\r\n<div class=\"pending-section\">\r\n<h3>&#9203; Pending Payments</h3>\r\n<div id=\"pendingArea\"></div>\r\n</div>\r\n<h2>&#128101; Users</h2>\r\n<div class=\"toolbar\">\r\n<input id=\"searchInput\" placeholder=\"Search username...\" oninput=\"render()\">\r\n<select id=\"sortSel\" onchange=\"render()\">\r\n<option value=\"createdAt_desc\">Newest First</option>\r\n<option value=\"createdAt_asc\">Oldest First</option>\r\n<option value=\"quota_asc\">Quota Low-High</option>\r\n<option value=\"username_asc\">Name A-Z</option>\r\n<option value=\"online_desc\">Online First</option>\r\n</select>\r\n<button onclick=\"exportCSV()\">Export CSV</button>\r\n<button class=\"secondary\" onclick=\"logout()\">Logout</button>\r\n</div>\r\n<table>\r\n<thead><tr><th>Username</th><th>Email</th><th>Registered</th><th>Quota</th><th>Online</th><th></th></tr></thead>\r\n<tbody id=\"tbody\"></tbody>\r\n</table>\r\n<div id=\"visitorLog\" style=\"margin-top:20px\">\r\n<h3>&#128205; Visitor Log</h3>\r\n<div id=\"visitorTable\" style=\"max-height:200px;overflow-y:auto\"></div>\r\n<button class=\"danger\" onclick=\"clearVisitors()\" style=\"margin-top:8px\">Clear Visitor Log</button>\r\n</div>\r\n</div>\r\n</div>\r\n<\/script>\r\nlet DATA, PWD='';\r\nfunction esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}\r\nasync function doLogin(){\r\n  PWD=document.getElementById('adminPwd').value;\r\n  document.getElementById('adminErr').textContent='';\r\n  try {\r\n    const r=await fetch('/admin/users?pwd='+encodeURIComponent(PWD));\r\n    if(!r.ok){document.getElementById('adminErr').textContent='Wrong password';return;}\r\n    DATA=await r.json();\r\n    localStorage.setItem('ugochat_admin_pwd',PWD);\r\n    document.getElementById('loginBox').classList.add('hidden');\r\n    document.getElementById('panel').classList.remove('hidden');\r\n    render(); loadQR(); loadPending();\r\n  } catch(e){document.getElementById('adminErr').textContent='Error: '+e.message;}\r\n}\r\nfunction render(){\r\n  if(!DATA)return;\r\n  const s=document.getElementById('searchInput').value.toLowerCase();\r\n  const sort=document.getElementById('sortSel').value||'createdAt_desc';\r\n  const fields=sort.split('_'); const fk=fields[0]; const fd=fields[1];\r\n  let users=DATA.users.filter(u=>u.username.toLowerCase().includes(s));\r\n  users.sort((a,b)=>{\r\n    let va=fk==='quota'?(a.quota===-1?1e12:a.quota):(a[fk]||'');\r\n    let vb=fk==='quota'?(b.quota===-1?1e12:b.quota):(b[fk]||'');\r\n    if(typeof va==='string')return fd==='asc'?va.localeCompare(vb):vb.localeCompare(va);\r\n    return fd==='asc'?va-vb:vb-va;\r\n  });\r\n  const tb=document.getElementById('tbody');\r\n  tb.innerHTML='';\r\n  users.forEach(u=>{\r\n    const tr=document.createElement('tr');\r\n    const q=u.quota===-1?'\\u221E':u.quota;\r\n    const reg=new Date(u.createdAt).toLocaleString();\r\n    tr.innerHTML='<td>'+esc(u.username)+'</td><td>'+(u.email||'-')+'</td><td>'+reg+'</td><td>'+q+'</td><td>'+(u.online?'\\uD83D\\uDFE2':'-')+'</td>';\r\n    tb.appendChild(tr);\r\n  });\r\n  const st=DATA.stats||{};\r\n  document.getElementById('stTotal').textContent=st.total||0;\r\n  document.getElementById('stOnline').textContent=st.online||0;\r\n  document.getElementById('stEmail').textContent=st.withEmail||0;\r\n  document.getElementById('stVisits').textContent=st.visits||0;\r\n  document.getElementById('stToday').textContent=st.todayVisits||0;\r\n  document.getElementById('stMsg').textContent=st.messagesTotal||0;\r\n  document.getElementById('stReg').textContent=st.registersTotal||0;\r\n  document.getElementById('stLogin').textContent=st.loginsTotal||0;\r\n  document.getElementById('stIP').textContent=st.uniqueIPs||0;\r\n  if(DATA.visitorLog){renderVisitorLog(DATA.visitorLog);}\r\n}\r\nfunction renderVisitorLog(log){\r\n  const el=document.getElementById('visitorTable');\r\n  el.innerHTML='<table style=\"font-size:12px\"><thead><tr><th>Time</th><th>IP</th><th>Country</th><th>City</th></tr></thead><tbody></tbody></table>';\r\n  const tb=el.querySelector('tbody');\r\n  log.slice(-50).reverse().forEach(v=>{\r\n    const tr=document.createElement('tr');\r\n    tr.innerHTML='<td>'+new Date(v.ts).toLocaleString()+'</td><td>'+esc(v.ip||'')+'</td><td>'+(v.country||'-')+'</td><td>'+(v.city||'-')+'</td>';\r\n    tb.appendChild(tr);\r\n  });\r\n}\r\nfunction exportCSV(){\r\n  if(!DATA)return;\r\n  const rows=[['Username','Email','Registered','Quota','Online']];\r\n  DATA.users.forEach(u=>rows.push([u.username,u.email||'',new Date(u.createdAt).toLocaleString(),u.quota,u.online?'Y':'N']));\r\n  const csv='\\uFEFF'+rows.map(r=>r.map(c=>'\"'+String(c).replace(/\"/g,'\"\"')+'\"').join(',')).join('\\\\n');\r\n  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);\r\n  a.download='ugochat_users.csv';a.click();\r\n}\r\nasync function loadQR(){\r\n  try {\r\n    const r=await fetch('/api/pay-qr?pwd='+encodeURIComponent(PWD));\r\n    if(!r.ok)return;\r\n    const d=await r.json();\r\n    if(d.wechatUrl){document.getElementById('qrWechat').src=d.wechatUrl;document.getElementById('qrWechat').style.display='block';document.getElementById('qrWechatStatus').textContent='OK';}\r\n    if(d.alipayUrl){document.getElementById('qrAlipay').src=d.alipayUrl;document.getElementById('qrAlipay').style.display='block';document.getElementById('qrAlipayStatus').textContent='OK';}\r\n  } catch(e){}\r\n}\r\nasync function uploadQR(kind,file){\r\n  if(!file)return;\r\n  const reader=new FileReader();\r\n  reader.onload=async function(e){\r\n    try {\r\n      const r=await fetch('/api/pay-qr?pwd='+encodeURIComponent(PWD),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,dataUrl:e.target.result})});\r\n      if(r.ok){loadQR();alert('Uploaded!');}else{alert('Failed');}\r\n    } catch(e){alert('Error: '+e.message);}\r\n  };\r\n  reader.readAsDataURL(file);\r\n}\r\nasync function loadPending(){\r\n  try {\r\n    const r=await fetch('/admin/pending-list?pwd='+encodeURIComponent(PWD),{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});\r\n    if(!r.ok)return;\r\n    const d=await r.json();\r\n    const area=document.getElementById('pendingArea');\r\n    area.innerHTML='';\r\n    if(!d.pending||d.pending.length===0){area.innerHTML='<p style=\"font-size:13px;color:#999\">No pending requests</p>';return;}\r\n    d.pending.forEach(p=>{\r\n      const div=document.createElement('div');\r\n      div.className='pend-item';\r\n      const Q=String.fromCharCode(39);\r\n      let screenshotHtml='';\r\n      if(p.screenshot&&p.screenshot.startsWith('data:image/')){\r\n        screenshotHtml='<img data-full-src=\"'+p.screenshot+'\" src=\"'+p.screenshot+'\" style=\"width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer\" title=\"Click to enlarge\">';\r\n      } else {\r\n        screenshotHtml='<span style=\"color:#e53935;font-size:12px\">No screenshot</span>';\r\n      }\r\n      div.innerHTML='<span><b>'+esc(p.username)+'</b> - '+esc(p.pkg||'')+' ('+new Date(p.ts).toLocaleString()+')</span>'+screenshotHtml+'<button onclick=\"approvePay('+Q+esc(p.username)+Q+','+Q+esc(p.pkg||'')+Q+')\">Approve</button>';\r\n      area.appendChild(div);\r\n    });\r\n    area.onclick=function(e){\r\n      const img=e.target&&e.target.closest&&e.target.closest('img[data-full-src]');\r\n      if(img)window.open(img.getAttribute('data-full-src'),'_blank');\r\n    };\r\n  } catch(e){}\r\n}\r\nasync function approvePay(u,pkg){\r\n  if(!confirm('Approve payment for '+u+' ('+pkg+')?'))return;\r\n  try {\r\n    const r=await fetch('/admin/pay-approve?pwd='+encodeURIComponent(PWD),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,pkg})});\r\n    const d=await r.json();\r\n    if(d.ok){alert('Approved!');loadPending();render();}else{alert('Failed: '+(d.error||'?'));}\r\n  } catch(e){alert('Error: '+e.message);}\r\n}\r\nasync function clearVisitors(){\r\n  if(!confirm('Clear all visitor data?'))return;\r\n  try {\r\n    const r=await fetch('/admin/clear-visitors?pwd='+encodeURIComponent(PWD));\r\n    const d=await r.json();\r\n    if(d.ok){alert('Cleared');render();}else{alert('Failed');}\r\n  } catch(e){alert('Error: '+e.message);}\r\n}\r\nfunction logout(){localStorage.removeItem('ugochat_admin_pwd');location.reload();}\r\n(function(){\r\n  const saved=localStorage.getItem('ugochat_admin_pwd');\r\n  if(saved){document.getElementById('adminPwd').value=saved;doLogin();}\r\n})();\r\n<\/script>\r\n</body>\r\n</html>";
const TEST_HTML = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n<meta charset=\"UTF-8\">\r\n<title>ugochat Test</title>\r\n<style>\r\nbody{font-family:monospace;background:#1e1e1e;color:#ddd;padding:20px}\r\nh1{color:#1a73e8}\r\n.btn{background:#1a73e8;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin:4px}\r\n.log{background:#111;border:1px solid #333;border-radius:6px;padding:10px;margin-top:12px;height:300px;overflow-y:auto;font-size:13px;white-space:pre-wrap;word-break:break-all}\r\n.log div{margin-bottom:4px}\r\n.log .ok{color:#4caf50}.log .err{color:#f44336}.log .info{color:#2196f3}.log .warn{color:#ff9800}\r\n.status{font-size:14px;margin-bottom:8px}\r\n</style>\r\n</head>\r\n<body>\r\n<h1>ugochat Diagnostic</h1>\r\n<div class=\"status\" id=\"status\">Ready</div>\r\n<div><button class=\"btn\" onclick=\"runTest()\">Run Test</button></div>\r\n<div id=\"log\" class=\"log\"></div>\r\n\r\n</body>\r\n</html>\r\n\r\nexport const TEST_HTML_SCRIPT = ";
const ABOUT_HTML = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n<meta charset=\"UTF-8\">\r\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\">\r\n<title>About ugochat</title>\r\n<style>\r\n*{margin:0;padding:0;box-sizing:border-box}\r\nbody{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;min-height:100vh;display:flex;flex-direction:column;align-items:center}\r\n.nav{position:sticky;top:0;background:#1a73e8;width:100%;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:14px}\r\n.nav .brand{font-size:16px;font-weight:600;cursor:pointer}\r\n.nav a{color:#fff;opacity:.85;text-decoration:none;padding:3px 10px;border-radius:12px;background:rgba(255,255,255,.1)}\r\n.nav a:hover{opacity:1;background:rgba(255,255,255,.2)}\r\n.lang-btn{cursor:pointer;background:rgba(255,255,255,.15);border:none;color:#fff;padding:3px 10px;border-radius:12px;font-size:13px}\r\n.wrap{max-width:720px;width:100%;padding:32px 20px}\r\nh1{font-size:26px;color:#1a1a1a;margin-bottom:20px;text-align:center}\r\nh2{font-size:18px;color:#333;margin:24px 0 12px}\r\np{color:#555;line-height:1.7;font-size:15px;margin-bottom:12px}\r\n.features{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}\r\n.feat{background:#fff;padding:16px;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,.06)}\r\n.feat h3{font-size:15px;color:#1a73e8;margin-bottom:6px}\r\n.feat p{font-size:13px;color:#666;margin:0}\r\n.steps{background:#fff;padding:20px;border-radius:10px;margin:12px 0}\r\n.step{margin-bottom:14px;display:flex;align-items:flex-start;gap:12px}\r\n.step-num{background:#1a73e8;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:14px}\r\n.step-text{font-size:14px;color:#555;line-height:1.5;padding-top:4px}\r\n.cta{text-align:center;margin:24px 0}\r\n.cta a{display:inline-block;background:#1a73e8;color:#fff;padding:12px 32px;border-radius:24px;text-decoration:none;font-size:16px;font-weight:600}\r\n.cta a:hover{background:#1557b0}\r\n.footer{text-align:center;font-size:12px;color:#999;padding:20px 0}\r\n</style>\r\n</head>\r\n<body>\r\n<nav class=\"nav\">\r\n<span class=\"brand\" onclick=\"location.href='/'\">&#128172; ugochat</span>\r\n<div>\r\n<a href=\"/\">Chat</a>\r\n<a href=\"/about\">About</a>\r\n<a href=\"/pricing\">Pricing</a>\r\n<button class=\"lang-btn\" id=\"lngBtn\" onclick=\"usgLang()\">EN</button>\r\n</div>\r\n</nav>\r\n<div class=\"wrap\" id=\"content\"></div>\r\n<div class=\"footer\">ugochat &copy; 2026 | <a href=\"mailto:ugo2000@126.com\">ugo2000@126.com</a></div>\r\n\r\n</body>\r\n</html>\r\n\r\nexport const ABOUT_SCRIPT = ";
const PRICING_HTML = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n<meta charset=\"UTF-8\">\r\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\">\r\n<title>ugochat Pricing</title>\r\n<style>\r\n*{margin:0;padding:0;box-sizing:border-box}\r\nbody{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;min-height:100vh;display:flex;flex-direction:column;align-items:center}\r\n.nav{position:sticky;top:0;background:#1a73e8;width:100%;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:14px}\r\n.nav .brand{font-size:16px;font-weight:600;cursor:pointer}\r\n.nav a{color:#fff;opacity:.85;text-decoration:none;padding:3px 10px;border-radius:12px;background:rgba(255,255,255,.1)}\r\n.nav a:hover{opacity:1;background:rgba(255,255,255,.2)}\r\n.lang-btn{cursor:pointer;background:rgba(255,255,255,.15);border:none;color:#fff;padding:3px 10px;border-radius:12px;font-size:13px}\r\n.wrap{max-width:720px;width:100%;padding:32px 20px}\r\nh1{font-size:26px;color:#1a1a1a;margin-bottom:24px;text-align:center}\r\n.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}\r\n.card{background:#fff;border-radius:12px;padding:24px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06);transition:transform .2s}\r\n.card:hover{transform:translateY(-2px)}\r\n.card.popular{border:2px solid #ff9800;background:#fff8e1}\r\n.card .tag{display:inline-block;background:#1a73e8;color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;margin-bottom:8px}\r\n.card.popular .tag{background:#ff9800}\r\n.card h3{font-size:18px;color:#333;margin-bottom:8px}\r\n.card .price{font-size:32px;font-weight:700;color:#1a73e8;margin:8px 0}\r\n.card .price span{font-size:14px;font-weight:400;color:#999}\r\n.card .desc{font-size:13px;color:#666;margin-bottom:16px}\r\n.card .btn{display:inline-block;background:#1a73e8;color:#fff;padding:10px 24px;border-radius:20px;text-decoration:none;font-size:14px}\r\n.card.popular .btn{background:#ff9800}\r\n.faq h2{font-size:18px;color:#333;margin:24px 0 12px;text-align:center}\r\n.faq-item{background:#fff;border-radius:10px;padding:16px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.05)}\r\n.faq-item h4{font-size:14px;color:#333;margin-bottom:6px}\r\n.faq-item p{font-size:13px;color:#666;line-height:1.5}\r\n.footer{text-align:center;font-size:12px;color:#999;padding:20px 0}\r\n</style>\r\n</head>\r\n<body>\r\n<nav class=\"nav\">\r\n<span class=\"brand\" onclick=\"location.href='/'\">&#128172; ugochat</span>\r\n<div>\r\n<a href=\"/\">Chat</a>\r\n<a href=\"/about\">About</a>\r\n<a href=\"/pricing\">Pricing</a>\r\n<button class=\"lang-btn\" id=\"lngBtn\" onclick=\"usgLang()\">EN</button>\r\n</div>\r\n</nav>\r\n<div class=\"wrap\" id=\"content\"></div>\r\n<div class=\"footer\">ugochat &copy; 2026</div>\r\n\r\n</body>\r\n</html>\r\n\r\nexport const ABOUT_HTML_SCRIPT = ";
const SITEMAP_XML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\r\n<url><loc>https://chathub.asia/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\r\n<url><loc>https://chathub.asia/about</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\r\n<url><loc>https://chathub.asia/pricing</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\r\n<url><loc>https://chathub.asia/features</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\r\n<url><loc>https://chathub.asia/random-chat</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\r\n<url><loc>https://chathub.asia/anonymous-chat</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\r\n<url><loc>https://chathub.asia/online-chat</loc><changefreq>daily</changefreq><priority>0.9</priority></url>\r\n<url><loc>https://chathub.asia/faq</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\r\n<url><loc>https://chathub.asia/privacy</loc><changefreq>yearly</changefreq><priority>0.5</priority></url>\r\n<url><loc>https://chathub.asia/terms</loc><changefreq>yearly</changefreq><priority>0.5</priority></url>\r\n<url><loc>https://chathub.asia/safety</loc><changefreq>yearly</changefreq><priority>0.5</priority></url>\r\n</urlset>";
const ROBOTS_TXT = "User-agent: *\r\nAllow: /\r\nDisallow: /admin\r\nDisallow: /chat\r\nSitemap: https://chathub.asia/sitemap.xml";
const FAQ_HTML = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n\r\n  <meta charset=\"UTF-8\">\r\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n  <title>FAQ - ugochat Anonymous Chat</title>\r\n  <meta name=\"description\" content=\"Frequently asked questions about ugochat anonymous chat platform, messaging quotas, payments, and privacy.\">\r\n  <meta name=\"keywords\" content=\"faq,help,questions,answers,support,quota,payment,privacy anonymous chat\">\r\n  <meta property=\"og:title\" content=\"FAQ - ugochat Anonymous Chat\">\r\n  <meta property=\"og:description\" content=\"Frequently asked questions about ugochat anonymous chat platform, messaging quotas, payments, and privacy.\">\r\n  <meta property=\"og:type\" content=\"website\">\r\n  <link rel=\"canonical\" href=\"https://chathub.asia\">\r\n\r\n<style>\r\n  body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#0f172a;color:#e2e8f0;line-height:1.6}\r\n  h1{color:#60a5fa;margin-bottom:16px}h2{color:#93c5fd;margin-top:32px;margin-bottom:12px}\r\n  a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}\r\n  .nav{margin-bottom:32px;padding:16px;background:#1e293b;border-radius:8px;display:flex;flex-wrap:wrap;gap:12px}\r\n  .nav a{padding:6px 12px;background:#334155;border-radius:4px;color:#e2e8f0}.nav a:hover{background:#475569;text-decoration:none}\r\n  .card{background:#1e293b;padding:24px;border-radius:12px;margin-bottom:16px}\r\n  .cta{text-align:center;margin-top:32px}.cta a{display:inline-block;padding:12px 32px;background:#3b82f6;border-radius:8px;font-size:18px}.cta a:hover{background:#2563eb;text-decoration:none}\r\n  footer{text-align:center;margin-top:48px;padding:24px;color:#64748b;font-size:14px}\r\n</style>\r\n</head>\r\n<body>\r\n<nav class=\"nav\">\r\n  <a href=\"/\">Home</a><a href=\"/about\">About</a><a href=\"/pricing\">Pricing</a><a href=\"/features\">Features</a><a href=\"/safety\">Safety</a><a href=\"/faq\">FAQ</a><a href=\"/privacy\">Privacy</a>\r\n</nav>\r\n<h1>Frequently Asked Questions</h1>\r\n<div class=\"card\">\r\n<h2>How does anonymous chat work?</h2>\r\n<p>You register with a username and password. No real name, phone, or email verification required (though email is optional for password recovery). Your IP address is logged but not publicly displayed.</p>\r\n</div>\r\n<div class=\"card\">\r\n<h2>How many free messages do I get?</h2>\r\n<p>Every account starts with 100 free messages. These never expire. When you run out, you can purchase a plan for unlimited messaging.</p>\r\n</div>\r\n<div class=\"card\">\r\n<h2>How does payment work?</h2>\r\n<p>We support Alipay. After purchase, upload a screenshot of your payment. Admin reviews and approves within minutes. You can also contact us at <a href=\"mailto:ugo2000@126.com\">ugo2000@126.com</a>.</p>\r\n</div>\r\n<div class=\"card\">\r\n<h2>Is my chat private?</h2>\r\n<p>Messages are stored temporarily for delivery. Group chat messages are not permanently logged. Private messages between users are stored for session continuity. We do not sell or share your data.</p>\r\n</div>\r\n<div class=\"card\">\r\n<h2>What is random chat?</h2>\r\n<p>Random chat pairs you with a stranger. You can chat anonymously and tap \"Next\" at any time to find someone new. No awkwardness, no connections — just conversation.</p>\r\n</div>\r\n<div class=\"card\">\r\n<h2>Can I delete my account?</h2>\r\n<p>Contact us at <a href=\"mailto:ugo2000@126.com\">ugo2000@126.com</a> with your username and we will remove your data within 7 days.</p>\r\n</div>\r\n<div class=\"cta\"><a href=\"/\">Start Chatting</a></div>\r\n<footer>&copy; 2026 ugochat. All rights reserved.</footer>\r\n</body>\r\n</html>";
const FEATURES_HTML = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n\r\n  <meta charset=\"UTF-8\">\r\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n  <title>Features - ugochat Anonymous Chat</title>\r\n  <meta name=\"description\" content=\"Explore ugochat features: anonymous group chat, random stranger matching, private messaging, and more.\">\r\n  <meta name=\"keywords\" content=\"features,anonymous chat,group chat,random chat,private messaging,free chat\">\r\n  <meta property=\"og:title\" content=\"Features - ugochat Anonymous Chat\">\r\n  <meta property=\"og:description\" content=\"Explore ugochat features: anonymous group chat, random stranger matching, private messaging, and more.\">\r\n  <meta property=\"og:type\" content=\"website\">\r\n  <link rel=\"canonical\" href=\"https://chathub.asia\">\r\n<style>\r\n  body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#0f172a;color:#e2e8f0;line-height:1.6}\r\n  h1{color:#60a5fa;margin-bottom:16px}h2{color:#93c5fd;margin-top:32px;margin-bottom:12px}\r\n  a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}\r\n  .nav{margin-bottom:32px;padding:16px;background:#1e293b;border-radius:8px;display:flex;flex-wrap:wrap;gap:12px}\r\n  .nav a{padding:6px 12px;background:#334155;border-radius:4px;color:#e2e8f0}.nav a:hover{background:#475569;text-decoration:none}\r\n  .card{background:#1e293b;padding:24px;border-radius:12px;margin-bottom:16px}\r\n  .cta{text-align:center;margin-top:32px}.cta a{display:inline-block;padding:12px 32px;background:#3b82f6;border-radius:8px;font-size:18px}.cta a:hover{background:#2563eb;text-decoration:none}\r\n  footer{text-align:center;margin-top:48px;padding:24px;color:#64748b;font-size:14px}\r\n</style>\r\n</head>\r\n<body>\r\n<nav class=\"nav\">\r\n  <a href=\"/\">Home</a><a href=\"/about\">About</a><a href=\"/pricing\">Pricing</a><a href=\"/features\">Features</a><a href=\"/safety\">Safety</a><a href=\"/faq\">FAQ</a><a href=\"/privacy\">Privacy</a>\r\n</nav>\r\n<h1>Platform Features</h1>\r\n<div class=\"card\"><h2>Anonymous Group Chat</h2><p>Join the live group chat room and talk with everyone. No real names, no tracking — just real-time conversation with other users.</p></div>\r\n<div class=\"card\"><h2>Random Stranger Chat</h2><p>Tap \"Random\" to be paired with a stranger. Chat anonymously, and tap \"Next\" anytime to find someone new. Perfect for making new friends worldwide.</p></div>\r\n<div class=\"card\"><h2>Private Messaging</h2><p>Send direct messages to specific users. Lock icons indicate private conversations. Your messages are end-to-end within the session.</p></div>\r\n<div class=\"card\"><h2>Free to Start</h2><p>Every account gets 100 free messages. No credit card required. Upgrade only when you want unlimited messaging.</p></div>\r\n<div class=\"card\"><h2>Simple &amp; Fast</h2><p>No app download needed. Works in any browser on desktop or mobile. WebSocket-powered real-time delivery with automatic reconnection.</p></div>\r\n<div class=\"card\"><h2>Safe Environment</h2><p>We log IP addresses for safety and moderation. Inappropriate behavior may result in account suspension. See our <a href=\"/safety\">Safety Guide</a> for tips.</p></div>\r\n<div class=\"cta\"><a href=\"/\">Try It Free</a></div>\r\n<footer>&copy; 2026 ugochat. All rights reserved.</footer>\r\n</body>\r\n</html>";
const ANONYMOUS_HTML = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n\r\n  <meta charset=\"UTF-8\">\r\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n  <title>Anonymous Chat - ugochat</title>\r\n  <meta name=\"description\" content=\"Chat anonymously online with strangers or in group chat. No real name, no phone required. Free to start with 100 messages.\">\r\n  <meta name=\"keywords\" content=\"anonymous chat,anonymous messaging,chat without registration,free anonymous chat,online chat strangers\">\r\n  <meta property=\"og:title\" content=\"Anonymous Chat - ugochat\">\r\n  <meta property=\"og:description\" content=\"Chat anonymously online with strangers or in group chat. No real name, no phone required. Free to start with 100 messages.\">\r\n  <meta property=\"og:type\" content=\"website\">\r\n  <link rel=\"canonical\" href=\"https://chathub.asia\">\r\n<style>\r\n  body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#0f172a;color:#e2e8f0;line-height:1.6}\r\n  h1{color:#60a5fa;margin-bottom:16px}h2{color:#93c5fd;margin-top:32px;margin-bottom:12px}\r\n  a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}\r\n  .nav{margin-bottom:32px;padding:16px;background:#1e293b;border-radius:8px;display:flex;flex-wrap:wrap;gap:12px}\r\n  .nav a{padding:6px 12px;background:#334155;border-radius:4px;color:#e2e8f0}.nav a:hover{background:#475569;text-decoration:none}\r\n  .card{background:#1e293b;padding:24px;border-radius:12px;margin-bottom:16px}\r\n  .cta{text-align:center;margin-top:32px}.cta a{display:inline-block;padding:12px 32px;background:#3b82f6;border-radius:8px;font-size:18px}.cta a:hover{background:#2563eb;text-decoration:none}\r\n  footer{text-align:center;margin-top:48px;padding:24px;color:#64748b;font-size:14px}\r\n</style>\r\n</head>\r\n<body>\r\n<nav class=\"nav\">\r\n  <a href=\"/\">Home</a><a href=\"/about\">About</a><a href=\"/pricing\">Pricing</a><a href=\"/features\">Features</a><a href=\"/safety\">Safety</a><a href=\"/faq\">FAQ</a><a href=\"/privacy\">Privacy</a>\r\n</nav>\r\n<h1>Anonymous Chat</h1>\r\n<div class=\"card\"><h2>Your Identity Stays Private</h2><p>No real name, no phone number, no email required. Choose any username and start chatting immediately. Your IP is logged for safety, never shared.</p></div>\r\n<div class=\"card\"><h2>Chat with Strangers</h2><p>Use the Random Chat feature to meet new people from around the world. Each conversation is completely anonymous. Tap \"Next\" to move on anytime.</p></div>\r\n<div class=\"card\"><h2>Group Chat Anonymously</h2><p>Join the live group chat room. See usernames but not real identities. Perfect for casual conversation with a community.</p></div>\r\n<div class=\"card\"><h2>Private Conversations</h2><p>Send private messages to other users you meet in chat. Lock icons show when a conversation is private and between you and the recipient only.</p></div>\r\n<div class=\"cta\"><a href=\"/\">Start Chatting Anonymously</a></div>\r\n<footer>&copy; 2026 ugochat. All rights reserved.</footer>\r\n</body>\r\n</html>";
const RANDOM_HTML = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n\r\n  <meta charset=\"UTF-8\">\r\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n  <title>Random Chat - ugochat</title>\r\n  <meta name=\"description\" content=\"Meet and chat with random strangers online. Anonymous, fun, and free. Start with 100 messages and upgrade for unlimited.\">\r\n  <meta name=\"keywords\" content=\"random chat,stranger chat,random stranger,chat with strangers,meet new people,anonymous chat random\">\r\n  <meta property=\"og:title\" content=\"Random Chat - ugochat\">\r\n  <meta property=\"og:description\" content=\"Meet and chat with random strangers online. Anonymous, fun, and free. Start with 100 messages and upgrade for unlimited.\">\r\n  <meta property=\"og:type\" content=\"website\">\r\n  <link rel=\"canonical\" href=\"https://chathub.asia\">\r\n<style>\r\n  body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#0f172a;color:#e2e8f0;line-height:1.6}\r\n  h1{color:#60a5fa;margin-bottom:16px}h2{color:#93c5fd;margin-top:32px;margin-bottom:12px}\r\n  a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}\r\n  .nav{margin-bottom:32px;padding:16px;background:#1e293b;border-radius:8px;display:flex;flex-wrap:wrap;gap:12px}\r\n  .nav a{padding:6px 12px;background:#334155;border-radius:4px;color:#e2e8f0}.nav a:hover{background:#475569;text-decoration:none}\r\n  .card{background:#1e293b;padding:24px;border-radius:12px;margin-bottom:16px}\r\n  .cta{text-align:center;margin-top:32px}.cta a{display:inline-block;padding:12px 32px;background:#3b82f6;border-radius:8px;font-size:18px}.cta a:hover{background:#2563eb;text-decoration:none}\r\n  footer{text-align:center;margin-top:48px;padding:24px;color:#64748b;font-size:14px}\r\n</style>\r\n</head>\r\n<body>\r\n<nav class=\"nav\">\r\n  <a href=\"/\">Home</a><a href=\"/about\">About</a><a href=\"/pricing\">Pricing</a><a href=\"/features\">Features</a><a href=\"/safety\">Safety</a><a href=\"/faq\">FAQ</a><a href=\"/privacy\">Privacy</a>\r\n</nav>\r\n<h1>Random Chat</h1>\r\n<div class=\"card\"><h2>Meet Strangers Worldwide</h2><p>Our random chat feature pairs you with a stranger anywhere in the world. Say hi, share a laugh, or have a deep conversation — entirely on your terms.</p></div>\r\n<div class=\"card\"><h2>Easy to Start</h2><p>Just register, tap \"Random\", and you're connected. No complicated setup, no friend requests — pure spontaneous conversation.</p></div>\r\n<div class=\"card\"><h2>Next Anytime</h2><p>If the conversation isn't clicking, tap \"Next\" and instantly connect with someone new. No awkward goodbyes needed.</p></div>\r\n<div class=\"card\"><h2>Completely Anonymous</h2><p>Neither you nor the stranger reveals any personal information. You see usernames only. Stay safe and have fun.</p></div>\r\n<div class=\"cta\"><a href=\"/\">Try Random Chat</a></div>\r\n<footer>&copy; 2026 ugochat. All rights reserved.</footer>\r\n</body>\r\n</html>";
const ONLINE_HTML = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n\r\n  <meta charset=\"UTF-8\">\r\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n  <title>Online Chat Room - ugochat</title>\r\n  <meta name=\"description\" content=\"Join the live online chat room. Real-time group chat with other online users. Free to start, no download needed.\">\r\n  <meta name=\"keywords\" content=\"online chat,live chat,online chat room,group chat,real-time chat,web chat\">\r\n  <meta property=\"og:title\" content=\"Online Chat Room - ugochat\">\r\n  <meta property=\"og:description\" content=\"Join the live online chat room. Real-time group chat with other online users. Free to start, no download needed.\">\r\n  <meta property=\"og:type\" content=\"website\">\r\n  <link rel=\"canonical\" href=\"https://chathub.asia\">\r\n<style>\r\n  body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#0f172a;color:#e2e8f0;line-height:1.6}\r\n  h1{color:#60a5fa;margin-bottom:16px}h2{color:#93c5fd;margin-top:32px;margin-bottom:12px}\r\n  a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}\r\n  .nav{margin-bottom:32px;padding:16px;background:#1e293b;border-radius:8px;display:flex;flex-wrap:wrap;gap:12px}\r\n  .nav a{padding:6px 12px;background:#334155;border-radius:4px;color:#e2e8f0}.nav a:hover{background:#475569;text-decoration:none}\r\n  .card{background:#1e293b;padding:24px;border-radius:12px;margin-bottom:16px}\r\n  .cta{text-align:center;margin-top:32px}.cta a{display:inline-block;padding:12px 32px;background:#3b82f6;border-radius:8px;font-size:18px}.cta a:hover{background:#2563eb;text-decoration:none}\r\n  footer{text-align:center;margin-top:48px;padding:24px;color:#64748b;font-size:14px}\r\n</style>\r\n</head>\r\n<body>\r\n<nav class=\"nav\">\r\n  <a href=\"/\">Home</a><a href=\"/about\">About</a><a href=\"/pricing\">Pricing</a><a href=\"/features\">Features</a><a href=\"/safety\">Safety</a><a href=\"/faq\">FAQ</a><a href=\"/privacy\">Privacy</a>\r\n</nav>\r\n<h1>Online Chat Room</h1>\r\n<div class=\"card\"><h2>Real-Time Group Chat</h2><p>Join the live chat room where all online users can participate. Messages appear instantly — no page refresh needed.</p></div>\r\n<div class=\"card\"><h2>See Who's Online</h2><p>The member list shows all currently online users. Click any username to start a private conversation with them.</p></div>\r\n<div class=\"card\"><h2>Works Everywhere</h2><p>No app to download. Works in any modern browser on desktop, tablet, or mobile. Real-time updates via WebSocket.</p></div>\r\n<div class=\"card\"><h2>100 Free Messages</h2><p>Every account starts with 100 free messages. Upgrade to unlimited when you're ready.</p></div>\r\n<div class=\"cta\"><a href=\"/\">Join the Chat Room</a></div>\r\n<footer>&copy; 2026 ugochat. All rights reserved.</footer>\r\n</body>\r\n</html>";
const PRIVACY_HTML = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n\r\n  <meta charset=\"UTF-8\">\r\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n  <title>Privacy Policy - ugochat</title>\r\n  <meta name=\"description\" content=\"ugochat privacy policy. How we collect, use, and protect your data. Anonymous chat with minimal data collection.\">\r\n  <meta name=\"keywords\" content=\"privacy,privacy policy,data protection,anonymous chat privacy,personal data\">\r\n  <meta property=\"og:title\" content=\"Privacy Policy - ugochat\">\r\n  <meta property=\"og:description\" content=\"ugochat privacy policy. How we collect, use, and protect your data. Anonymous chat with minimal data collection.\">\r\n  <meta property=\"og:type\" content=\"website\">\r\n  <link rel=\"canonical\" href=\"https://chathub.asia\">\r\n<style>\r\n  body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#0f172a;color:#e2e8f0;line-height:1.6}\r\n  h1{color:#60a5fa;margin-bottom:16px}h2{color:#93c5fd;margin-top:32px;margin-bottom:12px}\r\n  a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}\r\n  .nav{margin-bottom:32px;padding:16px;background:#1e293b;border-radius:8px;display:flex;flex-wrap:wrap;gap:12px}\r\n  .nav a{padding:6px 12px;background:#334155;border-radius:4px;color:#e2e8f0}.nav a:hover{background:#475569;text-decoration:none}\r\n  .card{background:#1e293b;padding:24px;border-radius:12px;margin-bottom:16px}\r\n  .cta{text-align:center;margin-top:32px}.cta a{display:inline-block;padding:12px 32px;background:#3b82f6;border-radius:8px;font-size:18px}.cta a:hover{background:#2563eb;text-decoration:none}\r\n  footer{text-align:center;margin-top:48px;padding:24px;color:#64748b;font-size:14px}\r\n</style>\r\n</head>\r\n<body>\r\n<nav class=\"nav\">\r\n  <a href=\"/\">Home</a><a href=\"/about\">About</a><a href=\"/pricing\">Pricing</a><a href=\"/features\">Features</a><a href=\"/safety\">Safety</a><a href=\"/faq\">FAQ</a><a href=\"/privacy\">Privacy</a>\r\n</nav>\r\n<h1>Privacy Policy</h1>\r\n<div class=\"card\"><h2>Information We Collect</h2>\r\n<p><strong>Account Information:</strong> Username, password (hashed), and optional email address.</p>\r\n<p><strong>IP Address:</strong> Logged on registration and login for security and abuse prevention.</p>\r\n<p><strong>Messages:</strong> Group chat and private messages are stored temporarily for delivery. Private messages may be retained longer for session continuity.</p>\r\n</div>\r\n<div class=\"card\"><h2>How We Use Information</h2>\r\n<p>IP addresses are used for security, moderation, and abuse prevention. Email (if provided) is used only for account recovery and verification codes. We do not sell, trade, or rent your personal information.</p>\r\n</div>\r\n<div class=\"card\"><h2>Cookies</h2>\r\n<p>We use localStorage in your browser to store your username, language preference, and session token. No third-party tracking cookies are used.</p>\r\n</div>\r\n<div class=\"card\"><h2>Data Retention</h2>\r\n<p>Messages are stored on our servers. Group chat messages may be purged periodically. Private message retention depends on activity. Account deletion requests are honored within 7 days.</p>\r\n</div>\r\n<div class=\"card\"><h2>Contact</h2>\r\n<p>For privacy concerns, contact us at <a href=\"mailto:ugo2000@126.com\">ugo2000@126.com</a>.</p>\r\n</div>\r\n<div class=\"cta\"><a href=\"/\">Back to Chat</a></div>\r\n<footer>&copy; 2026 ugochat. All rights reserved.</footer>\r\n</body>\r\n</html>";
const TERMS_HTML = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n\r\n  <meta charset=\"UTF-8\">\r\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n  <title>Terms of Service - ugochat</title>\r\n  <meta name=\"description\" content=\"Terms of service for ugochat anonymous chat platform. User responsibilities, prohibited conduct, and limitations.\">\r\n  <meta name=\"keywords\" content=\"terms of service,terms,conditions,user agreement,chat rules\">\r\n  <meta property=\"og:title\" content=\"Terms of Service - ugochat\">\r\n  <meta property=\"og:description\" content=\"Terms of service for ugochat anonymous chat platform. User responsibilities, prohibited conduct, and limitations.\">\r\n  <meta property=\"og:type\" content=\"website\">\r\n  <link rel=\"canonical\" href=\"https://chathub.asia\">\r\n<style>\r\n  body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#0f172a;color:#e2e8f0;line-height:1.6}\r\n  h1{color:#60a5fa;margin-bottom:16px}h2{color:#93c5fd;margin-top:32px;margin-bottom:12px}\r\n  a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}\r\n  .nav{margin-bottom:32px;padding:16px;background:#1e293b;border-radius:8px;display:flex;flex-wrap:wrap;gap:12px}\r\n  .nav a{padding:6px 12px;background:#334155;border-radius:4px;color:#e2e8f0}.nav a:hover{background:#475569;text-decoration:none}\r\n  .card{background:#1e293b;padding:24px;border-radius:12px;margin-bottom:16px}\r\n  .cta{text-align:center;margin-top:32px}.cta a{display:inline-block;padding:12px 32px;background:#3b82f6;border-radius:8px;font-size:18px}.cta a:hover{background:#2563eb;text-decoration:none}\r\n  footer{text-align:center;margin-top:48px;padding:24px;color:#64748b;font-size:14px}\r\n</style>\r\n</head>\r\n<body>\r\n<nav class=\"nav\">\r\n  <a href=\"/\">Home</a><a href=\"/about\">About</a><a href=\"/pricing\">Pricing</a><a href=\"/features\">Features</a><a href=\"/safety\">Safety</a><a href=\"/faq\">FAQ</a><a href=\"/privacy\">Privacy</a>\r\n</nav>\r\n<h1>Terms of Service</h1>\r\n<div class=\"card\"><h2>Acceptance of Terms</h2>\r\n<p>By using ugochat, you agree to these terms. If you do not agree, do not use the service.</p>\r\n</div>\r\n<div class=\"card\"><h2>User Conduct</h2>\r\n<p>You agree not to use ugochat for:</p>\r\n<ul style=\"color:#cbd5e1;padding-left:20px\">\r\n<li>Harassment, threats, or intimidation of other users</li>\r\n<li>Distribution of illegal, harmful, or offensive content</li>\r\n<li>Impersonation of other people or entities</li>\r\n<li>Spam, automated bulk messages, or commercial solicitation</li>\r\n<li>Attempting to gain unauthorized access to other accounts or systems</li>\r\n</ul>\r\n</div>\r\n<div class=\"card\"><h2>Account Responsibility</h2>\r\n<p>You are responsible for keeping your password secure. You are responsible for all activity under your account. We may suspend or terminate accounts that violate these terms.</p>\r\n</div>\r\n<div class=\"card\"><h2>Service Availability</h2>\r\n<p>ugochat is provided \"as is\" without warranties of any kind. We do not guarantee uninterrupted service. We reserve the right to modify or discontinue the service at any time.</p>\r\n</div>\r\n<div class=\"card\"><h2>Payment &amp; Refunds</h2>\r\n<p>Upgrades are non-refundable. Once a payment is approved and activated, your account is upgraded. Contact us at <a href=\"mailto:ugo2000@126.com\">ugo2000@126.com</a> for billing disputes.</p>\r\n</div>\r\n<div class=\"card\"><h2>Contact</h2>\r\n<p>Questions about these terms? Email <a href=\"mailto:ugo2000@126.com\">ugo2000@126.com</a>.</p>\r\n</div>\r\n<div class=\"cta\"><a href=\"/\">Back to Chat</a></div>\r\n<footer>&copy; 2026 ugochat. All rights reserved.</footer>\r\n</body>\r\n</html>";
const SAFETY_HTML = "<!DOCTYPE html>\r\n<html lang=\"en\">\r\n<head>\r\n\r\n  <meta charset=\"UTF-8\">\r\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\r\n  <title>Safety Guide - ugochat Anonymous Chat</title>\r\n  <meta name=\"description\" content=\"Stay safe on ugochat: tips for anonymous chatting, avoiding scams, protecting your privacy, and reporting issues.\">\r\n  <meta name=\"keywords\" content=\"safety,online safety,chat safety,avoid scams,protect privacy,anonymous chat tips\">\r\n  <meta property=\"og:title\" content=\"Safety Guide - ugochat Anonymous Chat\">\r\n  <meta property=\"og:description\" content=\"Stay safe on ugochat: tips for anonymous chatting, avoiding scams, protecting your privacy, and reporting issues.\">\r\n  <meta property=\"og:type\" content=\"website\">\r\n  <link rel=\"canonical\" href=\"https://chathub.asia\">\r\n<style>\r\n  body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#0f172a;color:#e2e8f0;line-height:1.6}\r\n  h1{color:#60a5fa;margin-bottom:16px}h2{color:#93c5fd;margin-top:32px;margin-bottom:12px}\r\n  a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}\r\n  .nav{margin-bottom:32px;padding:16px;background:#1e293b;border-radius:8px;display:flex;flex-wrap:wrap;gap:12px}\r\n  .nav a{padding:6px 12px;background:#334155;border-radius:4px;color:#e2e8f0}.nav a:hover{background:#475569;text-decoration:none}\r\n  .card{background:#1e293b;padding:24px;border-radius:12px;margin-bottom:16px}\r\n  .cta{text-align:center;margin-top:32px}.cta a{display:inline-block;padding:12px 32px;background:#3b82f6;border-radius:8px;font-size:18px}.cta a:hover{background:#2563eb;text-decoration:none}\r\n  footer{text-align:center;margin-top:48px;padding:24px;color:#64748b;font-size:14px}\r\n\r\n.card{margin-bottom:16px}.tip-card{margin-bottom:12px;padding:16px;border-radius:8px}.green{background:#064e3b;border-left:4px solid #10b981}.red{background:#7f1d1d;border-left:4px solid #ef4444}.yellow{background:#78350f;border-left:4px solid #f59e0b}</style>\r\n</head>\r\n<body>\r\n<nav class=\"nav\">\r\n  <a href=\"/\">Home</a><a href=\"/about\">About</a><a href=\"/pricing\">Pricing</a><a href=\"/features\">Features</a><a href=\"/safety\">Safety</a><a href=\"/faq\">FAQ</a><a href=\"/privacy\">Privacy</a>\r\n</nav>\r\n<h1>Safety Guide</h1>\r\n<p>Anonymous chat is fun, but staying safe online is important. Here are our tips:</p>\r\n<div class=\"card green\"><h2>DO: Keep It Anonymous</h2><p>Never share your real name, phone number, home address, workplace, school name, or social media handles. Your anonymity is your protection.</p></div>\r\n<div class=\"card green\"><h2>DO: Use a Unique Username</h2><p>Choose a username that doesn't reveal your identity. Don't use your real name, birth year, or anything that could identify you in real life.</p></div>\r\n<div class=\"card green\"><h2>DO: Trust Your Instincts</h2><p>If a conversation feels uncomfortable, end it. Click \"Next\" in random chat, or close the private message. Your comfort is more important than politeness.</p></div>\r\n<div class=\"card red\"><h2>DON'T: Click Unknown Links</h2><p>Never click links shared by strangers. They may lead to phishing sites that steal your credentials or malware that infects your device.</p></div>\r\n<div class=\"card red\"><h2>DON'T: Send Money or Gifts</h2><p>No legitimate person you meet online should ever ask you for money, gift cards, or cryptocurrency. This is always a scam.</p></div>\r\n<div class=\"card yellow\"><h2>CAUTION: Photos and Video</h2><p>Be very careful about sending photos or enabling camera with strangers. Once an image is shared, you lose control over it.</p></div>\r\n<div class=\"card\"><h2>Reporting Issues</h2>\r\n<p>If you encounter someone violating these guidelines or making you feel unsafe:</p>\r\n<ul style=\"color:#cbd5e1;padding-left:20px\">\r\n<li>Immediately leave the conversation</li>\r\n<li>If you believe illegal activity is occurring, report it to local law enforcement</li>\r\n<li>For urgent matters, contact us at <a href=\"mailto:ugo2000@126.com\">ugo2000@126.com</a></li>\r\n</ul>\r\n</div>\r\n<div class=\"cta\"><a href=\"/\">Start Chatting Safely</a></div>\r\n<footer>&copy; 2026 ugochat. All rights reserved.</footer>\r\n</body>\r\n</html>";
