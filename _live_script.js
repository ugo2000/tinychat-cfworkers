
const wsUrl = 'wss://' + location.host + '/chat';
let ws, token, username, quota = 100, geo = '', manualClose = false;
let reconnectTimer = null, reconnectAttempts = 0;
let privateTo = '', randomPeer = null, randomFinding = false;
let lang = localStorage.getItem('tinychat_lang') || 'zh';
let pendingTimer = null;
let wxPollTimer = null;
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function api(path, body) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return fetch(path, { method: 'POST', headers: h, body: JSON.stringify(body || {}) });
}
function i18n(s) { return s || ''; }
const zh = {
  loginTitle:'Login', regTitle:'Register', loginBtn:'Login', regBtn:'Register',
  regLabelUser:'Username', regLabelPass:'Password', regLabelEmail:'Email (optional)',
  regPlaceholderUser:'Username', regPlaceholderPass:'Password',
  noAccount:'No account? Register', hasAccount:'Has account? Login',
  aboutLink:'About ugochat',
  selectPrivate:'Public Chat', dmPlaceholder:'Username', dmBtn:'DM',
  privateHint:'DM: {u}', connected:'Connected', reconnecting:'Reconnecting...',
  sessionExpired:'Session expired, please login again',
  sendPlaceholder:'Type message...', sendBtn:'Send',
  navChat:'Chat', navRandom:'Random', navAbout:'About', navPricing:'Pricing',
  logoutBtn:'Logout',
  quotaUsed:'Quota used: {n}', quotaExhausted:'Quota exhausted. Upgrade for unlimited.',
  buyTitle:'Upgrade', pkgOnce:'Lifetime', lblOnce:'One-time, unlimited',
  pkgYear:'Yearly', lblYear:'per year, unlimited',
  pkgMonth:'Monthly', lblMonth:'per month, unlimited',
  buyNote:'Real payment coming soon. Mock mode active.',
  buySuccess:'Upgrade successful! Enjoy unlimited messaging.',
  buyWaiting:'Waiting for admin approval...',
  footerAbout:'About ugochat', footerContact:'Questions? Contact',
  randomFinding:'Finding stranger...', randomPaired:'Paired! Say hi',
  randomNext:'Next', randomExit:'Exit', randomLeft:'Stranger left'
};
const en = {
  loginTitle:'Login', regTitle:'Register', loginBtn:'Login', regBtn:'Register',
  regLabelUser:'Username', regLabelPass:'Password', regLabelEmail:'Email (optional)',
  regPlaceholderUser:'Username', regPlaceholderPass:'Password',
  noAccount:'No account? Register', hasAccount:'Has account? Login',
  aboutLink:'About ugochat',
  selectPrivate:'Public Chat', dmPlaceholder:'Username', dmBtn:'DM',
  privateHint:'DM: {u}', connected:'Connected', reconnecting:'Reconnecting...',
  sessionExpired:'Session expired, please login again',
  sendPlaceholder:'Type message...', sendBtn:'Send',
  navChat:'Chat', navRandom:'Random', navAbout:'About', navPricing:'Pricing',
  logoutBtn:'Logout',
  quotaUsed:'Quota used: {n}', quotaExhausted:'Quota exhausted. Upgrade for unlimited.',
  buyTitle:'Upgrade', pkgOnce:'Lifetime', lblOnce:'One-time, unlimited',
  pkgYear:'Yearly', lblYear:'per year, unlimited',
  pkgMonth:'Monthly', lblMonth:'per month, unlimited',
  buyNote:'Real payment coming soon. Mock mode active.',
  buySuccess:'Upgrade successful! Enjoy unlimited messaging.',
  buyWaiting:'Waiting for admin approval...',
  footerAbout:'About ugochat', footerContact:'Questions? Contact',
  randomFinding:'Finding stranger...', randomPaired:'Paired! Say hi',
  randomNext:'Next', randomExit:'Exit', randomLeft:'Stranger left'
};
function t(k) { return (lang === 'zh' ? zh : en)[k] || k; }
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    const txt = t(k);
    if (el.tagName === 'INPUT') { el.placeholder = txt; } else { el.textContent = txt; }
  });
  document.querySelectorAll('.nav-link').forEach(el => { el.style.display = el.id && el.id.startsWith('nav') ? '' : ''; });
  const btn = document.getElementById('btnLogout');
  if (btn) btn.style.display = username ? '' : 'none';
  const navLangEl = document.getElementById('navLang');
  if (navLangEl) navLangEl.textContent = lang === 'zh' ? 'EN' : '中';
  if (privateTo) { const h = document.getElementById('privateMode'); if (h) h.textContent = 'DM: ' + privateTo; }
  updateQuotaBadge();
}
function switchLang() {
  lang = lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('tinychat_lang', lang);
  applyI18n();
  refreshChatI18n();
}
function navChat() { if (!username) { showLogin(); return; } startChat(); }
function navRandom() { if (!username) { showLogin(); } else startRandom(); }
function navAbout() { window.open('/about', '_blank'); }
function navPricing() { window.open('/pricing', '_blank'); }
function showPage(id) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); const p = document.getElementById('page' + id); if (p) p.classList.add('active'); }
function showLogin() { showPage('Login'); document.getElementById('loginUser').focus(); }
function showRegister() { showPage('Register'); document.getElementById('regUser').focus(); }
async function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  document.getElementById('loginError').textContent = '';
  try {
    const r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u, password:p}) });
    const d = await r.json();
    if (!d.ok) { document.getElementById('loginError').textContent = d.error || 'Login failed'; return; }
    token = d.token; username = d.username; quota = d.quota != null ? d.quota : 100;
    localStorage.setItem('tinychat_token', token);
    localStorage.setItem('tinychat_username', username);
    startChat();
  } catch(e) { document.getElementById('loginError').textContent = 'Network error'; }
}
async function doRegister() {
  const u = document.getElementById('regUser').value.trim();
  const p = document.getElementById('regPass').value;
  const e = document.getElementById('regEmail') ? document.getElementById('regEmail').value.trim() : '';
  document.getElementById('regError').textContent = '';
  try {
    const r = await fetch('/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u, password:p, email:e}) });
    const d = await r.json();
    if (!d.ok) { document.getElementById('regError').textContent = d.error || 'Register failed'; return; }
    token = d.token; username = d.username; quota = d.quota != null ? d.quota : 100;
    localStorage.setItem('tinychat_token', token);
    localStorage.setItem('tinychat_username', username);
    startChat();
  } catch(e) { document.getElementById('regError').textContent = 'Network error'; }
}
function startChat() {
  token = localStorage.getItem('tinychat_token');
  username = localStorage.getItem('tinychat_username');
  if (!token || !username) { showLogin(); return; }
  showPage('Chat');
  applyI18n();
  connectWS();
}
function connectWS() {
  manualClose = false;
  if (ws) { ws.onclose = null; ws.close(); }
  ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    reconnectAttempts = 0;
    updateConnDot('🟢');
    ws.send(JSON.stringify({type:'auth', token}));
  };
  ws.onmessage = evt => { try { handleWSMessage(JSON.parse(evt.data)); } catch(e) {} };
  ws.onclose = () => { if (!manualClose) scheduleReconnect(); updateConnDot('🔴'); };
  ws.onerror = () => { updateConnDot('🔴'); };
}
function updateConnDot(color) {
  const dot = document.getElementById('connDot');
  if (dot) dot.textContent = color === '🟢' ? '🟢' : color === '🟡' ? '🟡' : '🔴';
}
function scheduleReconnect() {
  if (manualClose) return;
  clearTimeout(reconnectTimer);
  const delay = reconnectAttempts < 3 ? 1500 : Math.min(15000, 3000 * Math.pow(1.5, reconnectAttempts - 3));
  reconnectAttempts++;
  reconnectTimer = setTimeout(connectWS, delay);
}
function handleWSMessage(msg) {
  if (msg.type === 'init') {
    geo = msg.geo || '';
    msg.messages && msg.messages.forEach(m => addMessage(m));
    msg.online && msg.online.forEach(u => addOnlineUser(u));
    updateQuotaBadge();
  } else if (msg.type === 'message') {
    addMessage({...msg, direction:'incoming'});
  } else if (msg.type === 'online') {
    addOnlineUser({username:msg.username, geo:msg.geo});
    addSystem(msg.username + ' joined');
  } else if (msg.type === 'offline') {
    removeMember(msg.username);
    addSystem(msg.username + ' left');
  } else if (msg.type === 'private') {
    addMessage({...msg, direction:'incoming', private:true});
  } else if (msg.type === 'quota') {
    quota = msg.quota;
    updateQuotaBadge();
  } else if (msg.type === 'system') {
    if (msg.code === 'QUOTA_EXHAUSTED') { openBuy(); }
    addSystem(msg.text || '');
  } else if (msg.type === 'random_waiting') {
    randomFinding = true; randomPeer = null;
    document.getElementById('randomBanner').style.display = '';
    document.getElementById('randomStatus').textContent = t('randomFinding');
    document.getElementById('btnRandom').classList.add('active');
  } else if (msg.type === 'random_paired') {
    randomFinding = false; randomPeer = msg.peer; randomTo = msg.peer;
    document.getElementById('randomBanner').style.display = '';
    document.getElementById('randomStatus').textContent = t('randomPaired');
    document.getElementById('btnRandom').classList.add('active');
  } else if (msg.type === 'random_msg') {
    addMessage({from:msg.from, geo:msg.geo, text:msg.text, direction:'incoming', private:true});
  } else if (msg.type === 'random_peer_left') {
    randomPeer = null; randomFinding = false;
    document.getElementById('randomBanner').style.display = 'none';
    document.getElementById('btnRandom').classList.remove('active');
    addSystem(t('randomLeft'));
  }
}
let lastMembers = [];
function addOnlineUser(u) {
  if (typeof u === 'object') { lastMembers.push(u.username); } else { lastMembers.push(u); }
  renderMembers(lastMembers);
}
function removeMember(u) {
  lastMembers = lastMembers.filter(m => m !== u);
  renderMembers(lastMembers);
}
function renderMembers(members) {
  lastMembers = members || lastMembers || [];
  const sel = document.getElementById('privateTo');
  if (!sel) return;
  sel.innerHTML = '<option value="" id="optPublic">' + t('selectPrivate') + '</option>';
  members.forEach(m => {
    const nm = typeof m === 'object' ? m.username : m;
    if (nm && nm !== username) {
      const o = document.createElement('option'); o.value = nm; o.textContent = '✉ ' + nm; sel.appendChild(o);
    }
  });
}
function onSelectChange() {
  const sel = document.getElementById('privateTo');
  if (!sel) return;
  privateTo = sel.value;
  const dm = document.getElementById('privateMode');
  const dmInp = document.getElementById('dmInput');
  if (privateTo) {
    if (dm) { dm.style.display = ''; dm.textContent = 'DM: ' + privateTo; }
    if (dmInp) dmInp.style.display = 'none';
  } else {
    if (dm) { dm.style.display = 'none'; }
    if (dmInp) dmInp.style.display = '';
  }
}
function onSelectChangeReset() { onSelectChange(); }
function applyDmInput() {
  const inp = document.getElementById('dmInput');
  if (!inp) return;
  const v = inp.value.trim();
  if (!v) return;
  privateTo = v;
  const dm = document.getElementById('privateMode');
  if (dm) { dm.style.display = ''; dm.textContent = 'DM: ' + privateTo; }
  inp.value = '';
  inp.style.display = 'none';
  const sel = document.getElementById('privateTo');
  if (sel) { sel.value = privateTo; }
}
function updateQuotaBadge() {
  const el = document.getElementById('quotaBadge');
  if (!el) return;
  if (quota < 0) { el.textContent = '∞'; el.style.display = ''; }
  else if (quota <= 10) { el.textContent = quota; el.style.display = ''; }
  else { el.style.display = 'none'; }
}
function refreshChatI18n() {
  renderMembers(lastMembers);
  if (privateTo) { const h = document.getElementById('privateMode'); if (h) h.textContent = 'DM: ' + privateTo; }
  if (document.getElementById('randomBanner').style.display !== 'none') {
    const s = document.getElementById('randomStatus');
    if (s) s.textContent = randomPeer ? t('randomPaired') : t('randomFinding');
  }
}
function addMessage(msg) {
  const area = document.getElementById('msgArea');
  if (!area) return;
  const div = document.createElement('div');
  let cls = 'msg';
  if (msg.private) cls += ' private';
  else if (msg.direction === 'outgoing') cls += ' outgoing';
  else if (msg.direction === 'incoming') cls += ' incoming';
  if (msg.type === 'system') cls = 'msg system';
  div.className = cls;
  if (msg.type === 'system') {
    div.textContent = msg.text || '';
  } else {
    const from = esc(msg.from || msg.username || '?');
    const geoTxt = msg.geo ? ' <span class="geo">(' + esc(msg.geo) + ')</span>' : '';
    const lock = msg.private ? ' &#128274;' : '';
    const ts = msg.ts ? '<span class="ts">' + new Date(msg.ts).toLocaleTimeString() + '</span>' : '';
    div.innerHTML = '<div class="uname">' + from + geoTxt + lock + '</div><div>' + esc(msg.text || '') + '</div>' + ts;
  }
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}
function addSystem(text) { addMessage({type:'system', text}); }
function sendMsg() {
  const inp = document.getElementById('msgInput');
  if (!inp || inp.disabled) return;
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  if (quota === 0) { openBuy(); return; }
  if (quota > 0) quota--;
  updateQuotaBadge();
  const msg = { type: 'message', text, ts: Date.now(), geo };
  if (randomPeer) {
    msg.type = 'random_msg'; msg.to = randomPeer;
    addMessage({...msg, direction:'outgoing', from:username, private:true});
  } else if (privateTo) {
    msg.type = 'private'; msg.to = privateTo;
    addMessage({...msg, direction:'outgoing', from:username, private:true});
  } else {
    addMessage({...msg, direction:'outgoing', from:username});
  }
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}
let randomTo = '';
function startRandom() {
  if (!username || !token) { showLogin(); return; }
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({type:'random'}));
  }
}
function nextRandom() {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({type:'random_next'}));
}
function exitRandom() {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({type:'random_leave'}));
  randomPeer = null; randomFinding = false;
  document.getElementById('randomBanner').style.display = 'none';
  document.getElementById('btnRandom').classList.remove('active');
}
function openBuy() { document.getElementById('buyModal').classList.add('show'); loadPayConfig(); }
function closeBuy() {
  document.getElementById('buyModal').classList.remove('show');
  clearInterval(wxPollTimer); clearInterval(pendingTimer);
}
function loadPayConfig() {
  document.getElementById('buyQrArea').style.display = 'none';
  document.getElementById('buyOptions').style.display = '';
  document.getElementById('buyResult').style.display = 'none';
  document.getElementById('buyCloseBtn').style.display = '';
}
async function doBuy(pkg) {
  clearInterval(wxPollTimer); clearInterval(pendingTimer);
  document.getElementById('buyOptions').style.display = 'none';
  const qrArea = document.getElementById('buyQrArea');
  qrArea.style.display = '';
  const tip = document.getElementById('buyQrTip');
  const img = document.getElementById('buyQrImg');
  const paidArea = document.getElementById('buyPaidBtnArea');
  img.style.display = 'none'; paidArea.style.display = 'none';
  tip.textContent = 'Processing...';
  try {
    const r = await api('/api/buy', {pkg, token});
    const d = await r.json();
    if (d.mock === false && d.code_url) {
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(d.code_url);
      img.style.display = 'block';
      tip.textContent = 'Scan with WeChat Pay';
      paidArea.style.display = 'none';
      wxPollTimer = setInterval(async () => {
        const pr = await api('/api/wxpay/status', {out_trade_no:d.out_trade_no, token});
        const pd = await pr.json();
        if (pd.paid) {
          clearInterval(wxPollTimer);
          quota = -1; updateQuotaBadge();
          document.getElementById('buyResultText').textContent = t('buySuccess');
          document.getElementById('buyResult').style.display = '';
          setTimeout(closeBuy, 1500);
        }
      }, 2000);
    } else if (d.personal) {
      if (d.wechatUrl) {
        img.src = d.wechatUrl; img.style.display = 'block';
        tip.textContent = 'WeChat Pay - scan or save';
      } else if (d.alipayUrl) {
        img.src = d.alipayUrl; img.style.display = 'block';
        tip.textContent = 'Alipay - scan or save';
      } else {
        tip.textContent = 'QR code not configured yet.';
      }
      paidArea.style.display = '';
      document.getElementById('buyPaidBtn').onclick = () => confirmPaid(pkg);
    } else {
      quota = -1; updateQuotaBadge();
      document.getElementById('buyResultText').textContent = t('buySuccess');
      document.getElementById('buyResult').style.display = '';
      setTimeout(closeBuy, 1200);
    }
  } catch(e) { tip.textContent = 'Error: ' + e.message; }
}
async function confirmPaid(pkg) {
  const tip = document.getElementById('buyQrTip') || {};
  if (tip) tip.textContent = t('buyWaiting');
  try {
    const r = await api('/api/pay-confirm', {pkg, token});
    const d = await r.json();
    if (d.pending) {
      pendingTimer = setInterval(async () => {
        const pr = await api('/api/pay-pending', {token});
        const pd = await pr.json();
        if (pd.approved) {
          clearInterval(pendingTimer);
          quota = -1; updateQuotaBadge();
          document.getElementById('buyResultText').textContent = t('buySuccess');
          document.getElementById('buyResult').style.display = '';
          setTimeout(closeBuy, 1500);
        }
      }, 3000);
      setTimeout(() => { if (pendingTimer) { clearInterval(pendingTimer); } }, 30000);
    } else if (d.quota < 0) {
      quota = -1; updateQuotaBadge();
      document.getElementById('buyResultText').textContent = t('buySuccess');
      document.getElementById('buyResult').style.display = '';
      setTimeout(closeBuy, 1500);
    }
  } catch(e) {}
}
function doLogout() {
  manualClose = true;
  if (ws) { ws.onclose = null; ws.close(); ws = null; }
  localStorage.removeItem('tinychat_token');
  localStorage.removeItem('tinychat_username');
  token = null; username = null; quota = 100;
  privateTo = ''; randomPeer = null;
  lastMembers = [];
  document.getElementById('msgArea').innerHTML = '';
  showLogin();
}
// Init
(function init() {
  token = localStorage.getItem('tinychat_token');
  username = localStorage.getItem('tinychat_username');
  lang = localStorage.getItem('tinychat_lang') || 'zh';
  applyI18n();
  if (token && username) { showPage('Chat'); connectWS(); }
  else { showLogin(); }
  document.getElementById('msgInput').disabled = true;
})();
