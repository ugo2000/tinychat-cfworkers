
const wsUrl = 'wss://' + location.host + '/chat';
const TINYCHAT_VER = '20260812-1810';
(function(){ try { fetch('/api/version').then(r=>r.json()).then(d=>{ if(d&&d.version&&d.version!==TINYCHAT_VER){ localStorage.setItem('tinychat_version', d.version); location.reload(true); } }).catch(()=>{}); } catch(e){} })();
let ws, token, username, quota = 100, geo = '', manualClose = false;
let reconnectTimer = null, reconnectAttempts = 0;
let privateTo = '', randomPeer = null, randomFinding = false;
let lang = localStorage.getItem('tinychat_lang') || 'en';
let pendingTimer = null;
let wxPollTimer = null;
let payPollTimer = null;
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function api(path, body) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return fetch(path, { method: 'POST', headers: h, body: JSON.stringify(body || {}) });
}
function i18n(s) { return s || ''; }
const en = {
  loginTitle:'Login', regTitle:'Register', loginBtn:'Login', regBtn:'Register',
  regLabelUser:'Username', regLabelPass:'Password', regLabelPassConfirm:'Confirm Password', regLabelEmail:'Email', regLabelCode:'Verification Code',
  sendCodeBtn:'Send Code', sendCodeSent:'Sent', sendCodeError:'Failed to send', codeSentTo:'Code sent to',
  codeInvalid:'Invalid code', codeExpired:'Code expired',
  regPlaceholderUser:'Username', regPlaceholderPass:'Password',
  noAccount:'No account? Register', hasAccount:'Has account? Login',
  passwordMismatch:'Passwords do not match',
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
  buyNote:'Scan the QR code with Alipay or WeChat to pay. After payment, click "I Paid" and your plan activates after confirmation.',
  uploadHint:'Upload payment screenshot to confirm:',
  paidBtn:'I Paid'
  buySuccess:'Upgrade successful! Enjoy unlimited messaging.',
  buyWaiting:'Waiting for admin approval...',
  upgradeBtn:'Upgrade', quotaUnlimited:'Unlimited', quotaRemaining:'Messages left',
  footerAbout:'About ugochat', footerContact:'Questions? Contact',
  randomFinding:'Finding stranger...', randomPaired:'Paired! Say hi',
  randomNext:'Next', randomExit:'Exit', randomLeft:'Stranger left'
};
const zh = {
  loginTitle:'登录', regTitle:'注册', loginBtn:'登录', regBtn:'注册',
  regLabelUser:'用户名', regLabelPass:'密码', regLabelPassConfirm:'确认密码', regLabelEmail:'邮箱', regLabelCode:'验证码',
  sendCodeBtn:'发送验证码', sendCodeSent:'已发送', sendCodeError:'发送失败', codeSentTo:'验证码已发送到',
  codeInvalid:'验证码错误', codeExpired:'验证码已过期',
  regPlaceholderUser:'用户名', regPlaceholderPass:'密码',
  noAccount:'没有账号？注册', hasAccount:'已有账号？登录',
  passwordMismatch:'两次密码不一致',
  aboutLink:'关于 ugochat',
  selectPrivate:'公开聊天', dmPlaceholder:'用户名', dmBtn:'私信',
  privateHint:'私信: {u}', connected:'已连接', reconnecting:'重连中...',
  sessionExpired:'会话过期，请重新登录',
  sendPlaceholder:'输入消息...', sendBtn:'发送',
  navChat:'聊天', navRandom:'随机', navAbout:'关于', navPricing:'价格',
  logoutBtn:'退出',
  quotaUsed:'已用配额: {n}', quotaExhausted:'配额用完，升级享无限',
  buyTitle:'升级', pkgOnce:'买断', lblOnce:'一次性买断，无限消息',
  pkgYear:'年付', lblYear:'每年无限',
  pkgMonth:'月付', lblMonth:'每月无限',
  buyNote:'使用支付宝或微信扫描二维码付款，付款后点"已支付"，审核通过后自动开通',
  uploadHint:'上传付款截图确认:',
  paidBtn:'已支付'
  buySuccess:'升级成功！享受无限消息',
  buyWaiting:'等待管理员审核...',
  upgradeBtn:'升级', quotaUnlimited:'无限', quotaRemaining:'剩余消息',
  footerAbout:'关于 ugochat', footerContact:'有问题？联系',
  randomFinding:'寻找陌生人...', randomPaired:'配对成功！打个招呼',
  randomNext:'下一个', randomExit:'退出', randomLeft:'陌生人已离开'
};
function t(k) { return (lang === 'zh' ? zh[k] : en[k]) || k; }
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    const txt = t(k);
    if (el.tagName === 'INPUT') { el.placeholder = txt; } else { el.textContent = txt; }
  });
  document.querySelectorAll('.nav-link').forEach(el => { el.style.display = el.id && el.id.startsWith('nav') ? '' : ''; });
  const btn = document.getElementById('btnLogout');
  if (btn) {
    btn.style.display = username ? '' : 'none';
    if (username) btn.innerHTML = '&#128682; ' + t('logoutBtn');
  }
  const upBtn = document.getElementById('btnUpgrade');
  if (upBtn) upBtn.style.display = username ? '' : 'none';
  const navLangEl = document.getElementById('navLang');
  if (navLangEl) navLangEl.textContent = lang === 'zh' ? 'EN' : '中';
  if (privateTo) { const h = document.getElementById('privateMode'); if (h) h.textContent = 'DM: ' + privateTo; }
  updateQuotaBadge();
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
  const pConfirm = document.getElementById('regPassConfirm').value;
  const e = document.getElementById('regEmail') ? document.getElementById('regEmail').value.trim() : '';
  const code = document.getElementById('regCode') ? document.getElementById('regCode').value.trim() : '';
  document.getElementById('regError').textContent = '';
  if (p !== pConfirm) {
    document.getElementById('regError').textContent = t('passwordMismatch');
    return;
  }
  if (!e) {
    document.getElementById('regError').textContent = 'Email required';
    return;
  }
  if (!code) {
    document.getElementById('regError').textContent = 'Verification code required';
    return;
  }
  try {
    const r = await fetch('/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u, password:p, email:e, code:code}) });
    const d = await r.json();
    if (!d.ok) { document.getElementById('regError').textContent = d.error || 'Register failed'; return; }
    token = d.token; username = d.username; quota = d.quota != null ? d.quota : 100;
    localStorage.setItem('tinychat_token', token);
    localStorage.setItem('tinychat_username', username);
    startChat();
  } catch(e) { document.getElementById('regError').textContent = 'Network error'; }
}
let codeTimer = null, codeCountdown = 0;
async function sendVerifyCode() {
  const e = document.getElementById('regEmail').value.trim();
  const btn = document.getElementById('sendCodeBtn');
  if (!e || !/^[^@]+@[^@]+.[^@]+$/.test(e)) {
    document.getElementById('regError').textContent = 'Invalid email';
    return;
  }
  if (codeCountdown > 0) return;
  btn.disabled = true;
  try {
    const r = await fetch('/api/send-code', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:e}) });
    const d = await r.json();
    if (d.ok) {
      // 在开发模式下，验证码会返回在响应中
      let msg = t('codeSentTo') + ' ' + e;
      if (d.code) {
        msg = '验证码: ' + d.code + ' (开发模式)';
        // 也显示英文
        if (lang === 'en') msg = 'Verification code: ' + d.code + ' (dev mode)';
      }
      document.getElementById('regError').textContent = msg;
      document.getElementById('regError').style.color = '#2e7d32'; // 绿色表示成功
      codeCountdown = 60;
      codeTimer = setInterval(() => {
        if (codeCountdown <= 0) {
          clearInterval(codeTimer);
          btn.textContent = t('sendCodeBtn');
          btn.disabled = false;
        } else {
          btn.textContent = codeCountdown + 's';
          codeCountdown--;
        }
      }, 1000);
    } else {
      document.getElementById('regError').textContent = d.error || t('sendCodeError');
      document.getElementById('regError').style.color = '#d32f2f';
      btn.disabled = false;
    }
  } catch(err) {
    document.getElementById('regError').textContent = t('sendCodeError');
    document.getElementById('regError').style.color = '#d32f2f';
    btn.disabled = false;
  }
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
  // Guard: reject literal "undefined"/null/empty tokens (old localStorage pollution)
  if (!token || token === 'undefined' || token === 'null' || token === '') {
    doLogout(); return;
  }
  const fullUrl = 'wss://' + location.host + '/chat?token=' + encodeURIComponent(token);
  ws = new WebSocket(fullUrl);
  ws.onopen = () => {
    reconnectAttempts = 0;
    updateConnDot('🟢');
  };
  ws.onmessage = evt => { try { handleWSMessage(JSON.parse(evt.data)); } catch(e) {} };
  ws.onclose = () => { if (!manualClose) scheduleReconnect(); updateConnDot('🔴'); const mi = document.getElementById('msgInput'); if (mi) mi.disabled = true; };
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
    document.getElementById('msgInput').disabled = false;
    msg.messages && msg.messages.forEach(m => addMessage(m));
    msg.online && msg.online.forEach(u => addOnlineUser(u));
    updateQuotaBadge();
  } else if (msg.type === 'message') {
    addMessage({...msg, direction: msg.username === username ? 'outgoing' : 'incoming'});
  } else if (msg.type === 'online') {
    addOnlineUser({username:msg.username, geo:msg.geo});
    addSystem(msg.username + ' joined');
  } else if (msg.type === 'offline') {
    removeMember(msg.username);
    addSystem(msg.username + ' left');
  } else if (msg.type === 'private') {
    addMessage({...msg, direction: msg.from === username ? 'outgoing' : 'incoming', private:true});
  } else if (msg.type === 'quota') {
    const wasLimited = quota > 0;
    quota = msg.quota;
    updateQuotaBadge();
    if (payPollTimer) { clearInterval(payPollTimer); payPollTimer = null; }
    if (quota < 0 && wasLimited) addSystem(t('buySuccess'));
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
    addMessage({from:msg.from, geo:msg.geo, text:msg.text, direction: msg.from === username ? 'outgoing' : 'incoming', private:true});
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
  if (quota < 0) { el.textContent = '∞'; el.title = t('quotaUnlimited') || 'Unlimited'; }
  else { el.textContent = quota; el.title = (t('quotaRemaining') || 'Messages left') + ': ' + quota; }
  el.style.display = '';
  el.style.cursor = 'pointer';
  el.onclick = () => { if (username) openBuy(); };
}
function refreshChatI18n() {
  renderMembers(lastMembers);
  if (privateTo) { const h = document.getElementById('privateMode'); if (h) h.textContent = 'DM: ' + privateTo; }
  if (document.getElementById('randomBanner').style.display !== 'none') {
    const s = document.getElementById('randomStatus');
    if (s) s.textContent = randomPeer ? t('randomPaired') : t('randomFinding');
  }
}
function fmtTime(ms) {
  const d = new Date(ms);
  const p = n => (n < 10 ? '0' + n : '' + n);
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
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
    const tsVal = msg.ts || msg.timestamp;
    const ts = tsVal ? '<span class="ts">' + fmtTime(tsVal) + '</span>' : '';
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
  } else if (privateTo) {
    msg.type = 'private'; msg.to = privateTo;
  }
  // No optimistic render: the server echoes every message to ALL sockets
  // (direction outgoing/incoming), so all devices of the same account stay in sync.
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
  if (payPollTimer) { clearInterval(payPollTimer); payPollTimer = null; }
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
      img.src = d.wechatUrl; img.style.display = 'block';
        tip.textContent = 'WeChat Pay - scan or save';
      } else if (d.alipayUrl) {
        img.src = d.alipayUrl; img.style.display = 'block';
        tip.textContent = 'Alipay - scan or save';
      } else {
        tip.textContent = 'QR code not configured yet.';
      }
      document.getElementById('buyUploadArea').style.display = '';
      document.getElementById('buyPaidBtnArea').style.display = 'none';
      const scr = document.getElementById('buyScreenshot');
      scr.value = '';
      const preview = document.getElementById('buyScreenshotPreview');
      preview.src = ''; preview.style.display = 'none';
      scr.onchange = () => {
        const file = scr.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
          preview.src = e.target.result; preview.style.display = 'block';
          document.getElementById('buyPaidBtnArea').style.display = '';
        };
        reader.readAsDataURL(file);
      };
    } else {
      // No payment configured - show error instead of giving free quota
      tip.textContent = 'Payment not configured. Contact admin.';
      qrArea.style.display = 'none';
      document.getElementById('buyOptions').style.display = '';
    }
  } catch(e) { tip.textContent = 'Error: ' + e.message; }
}
async function confirmPaid(pkg) {
  const scr = document.getElementById('buyScreenshot');
  const file = scr && scr.files[0];
  const screenshot = file ? await new Promise(resolve => {
    const r = new FileReader(); r.onload = e => resolve(e.target.result); r.readAsDataURL(file);
  }) : '';
  try {
    const r = await api('/api/pay-confirm', {pkg, token, screenshot});
    const d = await r.json();
    closeBuy();
    if (d.quota < 0 || d.approved) {
      quota = -1; updateQuotaBadge();
      addSystem(t('buySuccess'));
    } else {
      startPayPoll();
      addSystem(t('buyWaiting'));
    }
  } catch(e) {}
}
function startPayPoll() {
  if (payPollTimer) return; // already polling
  payPollTimer = setInterval(async () => {
    try {
      const pr = await api('/api/pay-pending', {token});
      const pd = await pr.json();
      if (pd.approved || pd.quota < 0) {
        clearInterval(payPollTimer); payPollTimer = null;
        quota = -1; updateQuotaBadge();
        addSystem(t('buySuccess'));
      }
    } catch(e) {}
  }, 3000);
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
  document.getElementById('msgInput').disabled = true;
  showLogin();
}
// Init
(function init() {
  token = localStorage.getItem('tinychat_token');
  username = localStorage.getItem('tinychat_username');
  lang = localStorage.getItem('tinychat_lang') || 'zh';
  // Sanitize localStorage pollution from old buggy versions
  if (token === 'undefined' || token === 'null' || token === '') {
    localStorage.removeItem('tinychat_token'); localStorage.removeItem('tinychat_username');
    token = null; username = null;
  }
  applyI18n();
  if (token && username) { showPage('Chat'); connectWS(); }
  else { showLogin(); }
  document.getElementById('msgInput').disabled = true;
})();
