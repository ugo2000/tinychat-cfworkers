export const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>ugochat</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;min-height:100vh;display:flex;flex-direction:column;align-items:center}
.container{width:100%;max-width:420px;min-height:100vh;max-height:800px;display:flex;flex-direction:column;background:#fff;box-shadow:0 2px 20px rgba(0,0,0,.08)}
.topnav{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#1a73e8;color:#fff;font-size:14px;flex-shrink:0;flex-wrap:wrap;gap:4px}
.topnav .brand{font-size:16px;font-weight:600;cursor:pointer}
.topnav .nav-links{display:flex;gap:6px;flex-wrap:wrap}
.topnav .nav-link{color:#fff;opacity:.85;cursor:pointer;text-decoration:none;padding:3px 8px;border-radius:12px;background:rgba(255,255,255,.1);font-size:13px}
.topnav .nav-link:hover,.topnav .nav-link.active{opacity:1;background:rgba(255,255,255,.25)}
.topnav .nav-right{display:flex;align-items:center;gap:6px}
.topnav .nav-link.lang-btn{background:rgba(255,255,255,.15)}
.page{display:none;flex-direction:column;flex:1;overflow:hidden;min-height:0}
.page.active{display:flex}
.form-page{padding:32px 24px;justify-content:center;flex-shrink:0;min-height:0}
.form-page h2{text-align:center;margin-bottom:20px;color:#1a1a1a;font-size:20px}
.form-group{margin-bottom:14px}
.form-group label{display:block;margin-bottom:4px;color:#555;font-size:13px}
.form-group input,select{padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;width:100%;outline:none}
.form-group input:focus,select:focus{border-color:#1a73e8}
.btn{padding:10px 20px;background:#1a73e8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;width:100%;margin-top:4px}
.btn:hover{background:#1557b0}
.btn.secondary{background:#666;margin-top:8px}
.btn.secondary:hover{background:#555}
.link-btn{background:none;border:none;color:#1a73e8;cursor:pointer;font-size:13px;padding:4px 0;text-align:center;width:100%;margin-top:8px}
.link-btn:hover{text-decoration:underline}
.err{color:#d32f2f;font-size:12px;margin-top:4px;min-height:16px;text-align:center}
.header{background:#1a73e8;color:#fff;padding:10px 14px;display:flex;align-items:center;gap:8px;font-size:13px;flex-shrink:0;flex-wrap:wrap}
.header .conn-dot{font-size:12px}
.header .online-count{margin-left:auto;font-size:12px;opacity:.85}
.chat-header{display:flex;align-items:center;padding:6px 10px;background:#f8f9fa;border-bottom:1px solid #e0e0e0;gap:6px;flex-wrap:wrap;flex-shrink:0}
.chat-header select,input{padding:5px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;max-width:140px}
.dm-target{display:flex;gap:4px;align-items:center;margin-left:auto}
.dm-target input{max-width:100px}
.dm-target button{background:#1a73e8;color:#fff;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:12px}
.private-mode{font-size:12px;color:#f57c00;background:#fff3e0;padding:2px 8px;border-radius:10px;white-space:nowrap}
.random-banner{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#e8f5e9;color:#2e7d32;font-size:13px;flex-shrink:0;flex-wrap:wrap}
.random-banner button{padding:3px 10px;border:none;border-radius:6px;cursor:pointer;font-size:12px}
.random-next{background:#4caf50;color:#fff}
.random-exit{background:#f44336;color:#fff}
.quota-badge{background:#ff9800;color:#fff;padding:2px 8px;border-radius:10px;font-size:12px;white-space:nowrap}
.upgrade-btn{background:#ff5722;color:#fff;border:none;padding:4px 10px;border-radius:10px;font-size:12px;cursor:pointer;white-space:nowrap}
.msg-area{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:6px;min-height:0}
.msg{background:#f0f2f5;padding:7px 11px;border-radius:12px;max-width:75%;word-break:break-word;font-size:14px;line-height:1.4}
.msg .uname{font-weight:600;color:#1a73e8;font-size:13px;margin-bottom:2px}
.msg .geo{font-size:11px;opacity:.65;margin-left:5px;font-weight:normal}
.msg .ts{font-size:10px;color:#999;margin-top:2px;display:block;text-align:right}
.msg.outgoing{background:#e3f2fd;align-self:flex-end}
.msg.incoming{background:#f0f2f5;align-self:flex-start}
.msg.private{background:#fff8e1;border:1px solid #ffe082}
.msg.system{background:#fce4ec;color:#c62828;max-width:90%;text-align:center;font-size:13px}
.input-bar{display:flex;gap:6px;padding:8px 10px;border-top:1px solid #e0e0e0;flex-shrink:0;align-items:center;flex-wrap:wrap}
.input-bar input{flex:1;padding:9px 12px;border:1px solid #ddd;border-radius:20px;outline:none;font-size:14px;min-width:0}
.input-bar input:focus{border-color:#1a73e8}
.input-bar button{padding:9px 16px;background:#1a73e8;color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:14px;white-space:nowrap}
.rand-btn{padding:8px 14px;background:#4caf50;color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:13px;margin-left:auto}
.rand-btn:hover{background:#388e3c}
.rand-btn.active{background:#ff9800}
.rand-btn .rnext{background:#f44336;padding:3px 8px;border-radius:6px;margin-left:6px}
.rand-btn .rexit{background:#666;padding:3px 8px;border-radius:6px;margin-left:4px}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;justify-content:center;align-items:center;z-index:1000}
.modal-overlay.show{display:flex}
.modal{background:#fff;border-radius:12px;padding:20px;max-width:340px;width:90%;max-height:80vh;overflow-y:auto}
.modal h3{text-align:center;margin-bottom:14px;font-size:16px;color:#1a1a1a}
.buy-options{display:flex;flex-direction:column;gap:10px}
.buy-opt{padding:12px;border:2px solid #e0e0e0;border-radius:10px;cursor:pointer;text-align:center;transition:border-color .2s}
.buy-opt:hover{border-color:#1a73e8}
.buy-opt.best{border-color:#ff9800;background:#fff8e1}
.buy-opt .pkg{font-weight:600;font-size:15px;color:#333}
.buy-opt .price{font-size:20px;font-weight:700;color:#1a73e8;margin:4px 0}
.buy-opt .label{font-size:12px;color:#666}
.buy-close{text-align:center;margin-top:12px}
.buy-close button{background:#999;color:#fff;border:none;padding:8px 20px;border-radius:8px;cursor:pointer}
#buyQrArea{margin-top:12px;text-align:center}
#buyQrTip{font-size:13px;color:#666;margin-bottom:8px}
#buyQrImg{margin:0 auto;display:block;max-width:200px}
.buy-paid-btn{background:#4caf50;color:#fff;border:none;padding:10px;width:100%;border-radius:8px;font-size:14px;cursor:pointer;margin-top:10px}
.buy-note{margin-top:8px;font-size:12px;color:#999;text-align:center}
.logout-btn{background:rgba(255,255,255,.15);border:none;color:#fff;padding:3px 10px;border-radius:12px;cursor:pointer;font-size:12px}
</style>
</head>
<body>
<div class="container">
<div class="topnav">
<span class="brand" onclick="navChat()">&#128172; ugochat</span>
<div class="nav-links">
<span class="nav-link" id="navChat" onclick="navChat()" data-i18n="navChat">&#128172; ugochat</span>
<span class="nav-link" id="navRandom" onclick="navRandom()">&#127922; Random</span>
<span class="nav-link" id="navPricing" onclick="navPricing()" target="_blank">&#128176; Pricing</span>
<span class="nav-link" id="navAbout" onclick="navAbout()" target="_blank">&#9432; About</span>
</div>
<div class="nav-right">

<button class="logout-btn" id="btnLogout" onclick="doLogout()" data-i18n="logoutBtn">&#128682; Logout</button>
</div>
</div>
<div id="pageLogin" class="page form-page">
<h2 data-i18n="loginTitle">Login</h2>
<div class="form-group"><label>Username or Email</label>
<input id="loginUser" maxlength="60" autocomplete="off" onkeydown="if(event.key==='Enter')doLogin()"></div>
<div class="form-group"><label data-i18n="regLabelPass">Password</label>
<input id="loginPass" type="password" onkeydown="if(event.key==='Enter')doLogin()"></div>
<button class="btn" onclick="doLogin()" data-i18n="loginBtn">Login</button>
<div class="err" id="loginError"></div>
<button class="link-btn" onclick="showRegister()" data-i18n="noAccount">No account? Register</button>
<button class="link-btn" onclick="navAbout()" data-i18n="aboutLink">About ugochat</button>
</div>
<div id="pageRegister" class="page form-page">
<h2 data-i18n="regTitle">Register</h2>
<div class="form-group"><label data-i18n="regLabelUser">Username</label>
<input id="regUser" maxlength="20" autocomplete="off"></div>
<div class="form-group"><label data-i18n="regLabelPass">Password</label>
<input id="regPass" type="password"></div>
<div class="form-group"><label data-i18n="regLabelPassConfirm">Confirm Password</label>
<input id="regPassConfirm" type="password" onkeydown="if(event.key==='Enter')doRegister()"></div>
<div class="form-group"><label>Email <span style="color:#f44336">*</span></label>
<input id="regEmail" type="email" maxlength="60" required></div>
<div class="form-group"><label data-i18n="regLabelCode">Verification Code</label>
<div style="display:flex;gap:6px"><input id="regCode" maxlength="6" style="flex:1"><button type="button" id="sendCodeBtn" onclick="sendVerifyCode()" data-i18n="sendCodeBtn">Send Code</button></div></div>
<button class="btn" onclick="doRegister()" data-i18n="regBtn">Register</button>
<div class="err" id="regError"></div>
<button class="link-btn" onclick="showLogin()" data-i18n="hasAccount">Has account? Login</button>
</div>
<div id="pageChat" class="page">
<div class="chat-header">
<span class="conn-dot" id="connDot">&#128308;</span>
<select id="privateTo" onchange="onSelectChange()"><option value="" data-i18n="selectPrivate">Public Chat</option></select>
<div class="dm-target"><input id="dmInput" data-i18n="dmPlaceholder" placeholder="Username"><button id="dmBtn" onclick="applyDmInput()">DM</button></div>
<span class="private-mode" id="privateMode" style="display:none"></span>
<button class="btn rand-btn" id="btnRandom" onclick="startRandom()">&#127922;</button>
<span class="quota-badge" id="quotaBadge" style="display:none"></span>
<button class="upgrade-btn" id="btnUpgrade" onclick="openBuy()" data-i18n="upgradeBtn">&#11088; 升级</button>
<span class="online-count" id="onlineCount"></span>
</div>
<div class="random-banner" id="randomBanner" style="display:none">
<span id="randomStatus"></span>
<button class="random-next" id="randomNextBtn" onclick="nextRandom()">Next</button>
<button class="random-exit" onclick="exitRandom()">Exit</button>
</div>
<div class="msg-area" id="msgArea"></div>
<div class="input-bar">
<input id="msgInput" disabled placeholder="..." onkeydown="if(event.key==='Enter'&&!event.shiftKey)sendMsg()">
<button onclick="sendMsg()" id="sendBtn">&#10148;</button>
<button class="rand-btn" id="randBtn" onclick="startRandom()">&#127922;</button>
</div>
</div>
</div>
<div class="modal-overlay" id="buyModal">
<div class="modal">
<h3 data-i18n="buyTitle">Upgrade</h3>
<div class="buy-options" id="buyOptions">
<div class="buy-opt" onclick="doBuy('once')"><div class="pkg" data-i18n="pkgOnce">Lifetime</div><div class="price">&#165;499</div><div class="label" data-i18n="lblOnce">One-time, unlimited</div></div>
<div class="buy-opt best" onclick="doBuy('sub_year')"><div class="pkg" data-i18n="pkgYear">Yearly</div><div class="price">&#165;299</div><div class="label" data-i18n="lblYear">per year, unlimited</div></div>
<div class="buy-opt" onclick="doBuy('sub')"><div class="pkg" data-i18n="pkgMonth">Monthly</div><div class="price">&#165;29.9</div><div class="label" data-i18n="lblMonth">per month, unlimited</div></div>
</div>
<div id="buyQrArea" style="display:none">
<div id="buyQrTip"></div>
<img id="buyQrImg" style="display:none">
<div id="buyUploadArea" style="display:none;margin:8px 0">
<div class="upload-hint">Upload payment screenshot to confirm:</div>
<input type="file" id="buyScreenshot" accept="image/*" style="font-size:12px">
<img id="buyScreenshotPreview" style="display:none;max-width:180px;max-height:180px;border:1px solid #ccc;border-radius:6px;margin-top:6px">
</div>
<div id="buyPaidBtnArea" style="display:none"><button class="buy-paid-btn" id="buyPaidBtn" data-i18n="paidBtn" onclick="confirmPaid()">I Paid</button></div>
</div>
<div id="buyResult" style="display:none;text-align:center;padding:10px 0">
<div id="buyResultText" style="font-size:15px;color:#2e7d32;font-weight:600"></div>
<button class="buy-close" onclick="closeBuy()">Close</button>
</div>
<div class="buy-note" id="buyNote" data-i18n="buyNote"></div>
<div class="buy-close" id="buyCloseBtn"><button onclick="closeBuy()">Close</button></div>
</div>
</div>
<script>
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
  if (navLangEl) navLangEl.textContent = lang === 'zh' ? 'EN' : '\u4E2D';
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
  if (!e || !/^[^@]+@[^@]+\.[^@]+$/.test(e)) {
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
    updateConnDot('\uD83D\uDFE2');
  };
  ws.onmessage = evt => { try { handleWSMessage(JSON.parse(evt.data)); } catch(e) {} };
  ws.onclose = () => { if (!manualClose) scheduleReconnect(); updateConnDot('\uD83D\uDD34'); const mi = document.getElementById('msgInput'); if (mi) mi.disabled = true; };
  ws.onerror = () => { updateConnDot('\uD83D\uDD34'); };
}
function updateConnDot(color) {
  const dot = document.getElementById('connDot');
  if (dot) dot.textContent = color === '\uD83D\uDFE2' ? '\uD83D\uDFE2' : color === '\uD83D\uDFE1' ? '\uD83D\uDFE1' : '\uD83D\uDD34';
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
      const o = document.createElement('option'); o.value = nm; o.textContent = '\u2709 ' + nm; sel.appendChild(o);
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
  if (quota < 0) { el.textContent = '\u221E'; el.title = t('quotaUnlimited') || 'Unlimited'; }
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
</script>
</body>
</html>`;

export const ADMIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>ugochat Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;min-height:100vh;display:flex;justify-content:center;align-items:flex-start;padding:20px}
.wrap{width:100%;max-width:1100px}
h1{text-align:center;margin-bottom:20px;color:#333}
.login-box{background:#fff;padding:32px;border-radius:12px;max-width:400px;margin:60px auto;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.login-box input{padding:10px 14px;border:1px solid #ddd;border-radius:8px;width:100%;font-size:15px;margin-bottom:10px}
.login-box button{background:#1a73e8;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;width:100%;font-size:15px}
.panel{background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.panel h2{margin-bottom:16px;color:#333;font-size:16px;border-bottom:1px solid #eee;padding-bottom:10px}
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px}
.stat{background:#f8f9fa;padding:14px;border-radius:8px;text-align:center}
.stat .n{font-size:24px;font-weight:700;color:#1a73e8}
.stat .l{font-size:12px;color:#666;margin-top:4px}
.toolbar{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center}
.toolbar input{padding:7px 10px;border:1px solid #ddd;border-radius:6px;flex:1;min-width:150px}
.toolbar select{padding:7px 10px;border:1px solid #ddd;border-radius:6px}
.toolbar button{padding:7px 14px;background:#1a73e8;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}
.toolbar button.danger{background:#d32f2f}
.toolbar button.secondary{background:#666}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #eee}
th{background:#f8f9fa;font-weight:600;color:#333;position:sticky;top:0}
tr:hover{background:#fafafa}
.err{color:#d32f2f;margin-top:8px;font-size:14px;min-height:20px}
.qr-section{margin-top:20px;padding-top:20px;border-top:1px solid #eee}
.qr-section h3{font-size:14px;color:#333;margin-bottom:10px}
.qr-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px}
.qr-item{flex:1;min-width:200px;background:#f8f9fa;padding:12px;border-radius:8px}
.qr-item label{font-size:13px;color:#666;display:block;margin-bottom:6px}
.qr-item img{max-width:150px;display:block;margin-bottom:6px}
.qr-item button{padding:4px 10px;background:#666;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px}
.pending-section{margin-top:20px}
#pendingArea .pend-item{display:flex;align-items:center;gap:10px;padding:10px;background:#fff8e1;border-radius:8px;margin-bottom:8px}
#pendingArea .pend-item span{flex:1;font-size:13px}
#pendingArea .pend-item button{padding:5px 12px;background:#4caf50;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px}
.hidden{display:none}
</style>
</head>
<body>
<div class="wrap">
<div class="login-box" id="loginBox">
<h1>&#128272; Admin</h1>
<input id="adminPwd" type="password" placeholder="Password" onkeydown="if(event.key==='Enter')doLogin()">
<button onclick="doLogin()">Enter</button>
<div class="err" id="adminErr"></div>
</div>
<div class="panel hidden" id="panel">
<h2>&#128202; ugochat Statistics</h2>
<div class="stats">
<div class="stat"><div class="n" id="stTotal">-</div><div class="l">Registered</div></div>
<div class="stat"><div class="n" id="stOnline">-</div><div class="l">Online</div></div>
<div class="stat"><div class="n" id="stEmail">-</div><div class="l">With Email</div></div>
<div class="stat"><div class="n" id="stVisits">-</div><div class="l">Total Visits</div></div>
<div class="stat"><div class="n" id="stToday">-</div><div class="l">Today</div></div>
<div class="stat"><div class="n" id="stMsg">-</div><div class="l">Messages</div></div>
<div class="stat"><div class="n" id="stReg">-</div><div class="l">Registers</div></div>
<div class="stat"><div class="n" id="stLogin">-</div><div class="l">Logins</div></div>
<div class="stat"><div class="n" id="stIP">-</div><div class="l">Unique IPs</div></div>
</div>
<div class="qr-section">
<h3>&#128179; Payment QR Codes</h3>
<div class="qr-row" id="qrRow">
<div class="qr-item"><label>WeChat Pay</label><img id="qrWechat" style="display:none"><span id="qrWechatStatus"></span><br><input type="file" id="qrFileWechat" accept="image/*" style="display:none"><button onclick="document.getElementById('qrFileWechat').click();document.getElementById('qrFileWechat').onchange=function(){uploadQR('wechat',this.files[0])}">Upload</button></div>
<div class="qr-item"><label>Alipay</label><img id="qrAlipay" style="display:none"><span id="qrAlipayStatus"></span><br><input type="file" id="qrFileAlipay" accept="image/*" style="display:none"><button onclick="document.getElementById('qrFileAlipay').click();document.getElementById('qrFileAlipay').onchange=function(){uploadQR('alipay',this.files[0])}">Upload</button></div>
</div>
</div>
<div class="pending-section">
<h3>&#9203; Pending Payments</h3>
<div id="pendingArea"></div>
</div>
<h2>&#128101; Users</h2>
<div class="toolbar">
<input id="searchInput" placeholder="Search username..." oninput="render()">
<select id="sortSel" onchange="render()">
<option value="createdAt_desc">Newest First</option>
<option value="createdAt_asc">Oldest First</option>
<option value="quota_asc">Quota Low-High</option>
<option value="username_asc">Name A-Z</option>
<option value="online_desc">Online First</option>
</select>
<button onclick="exportCSV()">Export CSV</button>
<button class="secondary" onclick="logout()">Logout</button>
</div>
<table>
<thead><tr><th>Username</th><th>Email</th><th>Registered</th><th>Quota</th><th>Online</th><th></th></tr></thead>
<tbody id="tbody"></tbody>
</table>
<div id="visitorLog" style="margin-top:20px">
<h3>&#128205; Visitor Log</h3>
<div id="visitorTable" style="max-height:200px;overflow-y:auto"></div>
<button class="danger" onclick="clearVisitors()" style="margin-top:8px">Clear Visitor Log</button>
</div>
</div>
</div>
<script>
let DATA, PWD='';
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
async function doLogin(){
  PWD=document.getElementById('adminPwd').value;
  document.getElementById('adminErr').textContent='';
  try {
    const r=await fetch('/admin/users?pwd='+encodeURIComponent(PWD));
    if(!r.ok){document.getElementById('adminErr').textContent='Wrong password';return;}
    DATA=await r.json();
    localStorage.setItem('ugochat_admin_pwd',PWD);
    document.getElementById('loginBox').classList.add('hidden');
    document.getElementById('panel').classList.remove('hidden');
    render(); loadQR(); loadPending();
  } catch(e){document.getElementById('adminErr').textContent='Error: '+e.message;}
}
function render(){
  if(!DATA)return;
  const s=document.getElementById('searchInput').value.toLowerCase();
  const sort=document.getElementById('sortSel').value||'createdAt_desc';
  const fields=sort.split('_'); const fk=fields[0]; const fd=fields[1];
  let users=DATA.users.filter(u=>u.username.toLowerCase().includes(s));
  users.sort((a,b)=>{
    let va=fk==='quota'?(a.quota===-1?1e12:a.quota):(a[fk]||'');
    let vb=fk==='quota'?(b.quota===-1?1e12:b.quota):(b[fk]||'');
    if(typeof va==='string')return fd==='asc'?va.localeCompare(vb):vb.localeCompare(va);
    return fd==='asc'?va-vb:vb-va;
  });
  const tb=document.getElementById('tbody');
  tb.innerHTML='';
  users.forEach(u=>{
    const tr=document.createElement('tr');
    const q=u.quota===-1?'\u221E':u.quota;
    const reg=new Date(u.createdAt).toLocaleString();
    tr.innerHTML='<td>'+esc(u.username)+'</td><td>'+(u.email||'-')+'</td><td>'+reg+'</td><td>'+q+'</td><td>'+(u.online?'\uD83D\uDFE2':'-')+'</td>';
    tb.appendChild(tr);
  });
  const st=DATA.stats||{};
  document.getElementById('stTotal').textContent=st.total||0;
  document.getElementById('stOnline').textContent=st.online||0;
  document.getElementById('stEmail').textContent=st.withEmail||0;
  document.getElementById('stVisits').textContent=st.visits||0;
  document.getElementById('stToday').textContent=st.todayVisits||0;
  document.getElementById('stMsg').textContent=st.messagesTotal||0;
  document.getElementById('stReg').textContent=st.registersTotal||0;
  document.getElementById('stLogin').textContent=st.loginsTotal||0;
  document.getElementById('stIP').textContent=st.uniqueIPs||0;
  if(DATA.visitorLog){renderVisitorLog(DATA.visitorLog);}
}
function renderVisitorLog(log){
  const el=document.getElementById('visitorTable');
  el.innerHTML='<table style="font-size:12px"><thead><tr><th>Time</th><th>IP</th><th>Country</th><th>City</th></tr></thead><tbody></tbody></table>';
  const tb=el.querySelector('tbody');
  log.slice(-50).reverse().forEach(v=>{
    const tr=document.createElement('tr');
    tr.innerHTML='<td>'+new Date(v.ts).toLocaleString()+'</td><td>'+esc(v.ip||'')+'</td><td>'+(v.country||'-')+'</td><td>'+(v.city||'-')+'</td>';
    tb.appendChild(tr);
  });
}
function exportCSV(){
  if(!DATA)return;
  const rows=[['Username','Email','Registered','Quota','Online']];
  DATA.users.forEach(u=>rows.push([u.username,u.email||'',new Date(u.createdAt).toLocaleString(),u.quota,u.online?'Y':'N']));
  const csv='\uFEFF'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='ugochat_users.csv';a.click();
}
async function loadQR(){
  try {
    const r=await fetch('/api/pay-qr?pwd='+encodeURIComponent(PWD));
    if(!r.ok)return;
    const d=await r.json();
    if(d.wechatUrl){document.getElementById('qrWechat').src=d.wechatUrl;document.getElementById('qrWechat').style.display='block';document.getElementById('qrWechatStatus').textContent='OK';}
    if(d.alipayUrl){document.getElementById('qrAlipay').src=d.alipayUrl;document.getElementById('qrAlipay').style.display='block';document.getElementById('qrAlipayStatus').textContent='OK';}
  } catch(e){}
}
async function uploadQR(kind,file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=async function(e){
    try {
      const r=await fetch('/api/pay-qr?pwd='+encodeURIComponent(PWD),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,dataUrl:e.target.result})});
      if(r.ok){loadQR();alert('Uploaded!');}else{alert('Failed');}
    } catch(e){alert('Error: '+e.message);}
  };
  reader.readAsDataURL(file);
}
async function loadPending(){
  try {
    const r=await fetch('/admin/pending-list?pwd='+encodeURIComponent(PWD),{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    if(!r.ok)return;
    const d=await r.json();
    const area=document.getElementById('pendingArea');
    area.innerHTML='';
    if(!d.pending||d.pending.length===0){area.innerHTML='<p style="font-size:13px;color:#999">No pending requests</p>';return;}
    d.pending.forEach(p=>{
      const div=document.createElement('div');
      div.className='pend-item';
      const Q=String.fromCharCode(39);
      let screenshotHtml='';
      if(p.screenshot&&p.screenshot.startsWith('data:image/')){
        screenshotHtml='<img src="'+esc(p.screenshot)+'" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer" onclick="window.open(\''+esc(p.screenshot)+'\',\'_blank\')" title="Click to enlarge">';
      } else {
        screenshotHtml='<span style="color:#e53935;font-size:12px">No screenshot</span>';
      }
      div.innerHTML='<span><b>'+esc(p.username)+'</b> - '+esc(p.pkg||'')+' ('+new Date(p.ts).toLocaleString()+')</span>'+screenshotHtml+'<button onclick="approvePay('+Q+esc(p.username)+Q+','+Q+esc(p.pkg||'')+Q+')">Approve</button>';
      area.appendChild(div);
    });
  } catch(e){}
}
async function approvePay(u,pkg){
  if(!confirm('Approve payment for '+u+' ('+pkg+')?'))return;
  try {
    const r=await fetch('/admin/pay-approve?pwd='+encodeURIComponent(PWD),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,pkg})});
    const d=await r.json();
    if(d.ok){alert('Approved!');loadPending();render();}else{alert('Failed: '+(d.error||'?'));}
  } catch(e){alert('Error: '+e.message);}
}
async function clearVisitors(){
  if(!confirm('Clear all visitor data?'))return;
  try {
    const r=await fetch('/admin/clear-visitors?pwd='+encodeURIComponent(PWD));
    const d=await r.json();
    if(d.ok){alert('Cleared');render();}else{alert('Failed');}
  } catch(e){alert('Error: '+e.message);}
}
function logout(){localStorage.removeItem('ugochat_admin_pwd');location.reload();}
(function(){
  const saved=localStorage.getItem('ugochat_admin_pwd');
  if(saved){document.getElementById('adminPwd').value=saved;doLogin();}
})();
</script>
</body>
</html>`;

export const TEST_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ugochat Test</title>
<style>
body{font-family:monospace;background:#1e1e1e;color:#ddd;padding:20px}
h1{color:#1a73e8}
.btn{background:#1a73e8;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin:4px}
.log{background:#111;border:1px solid #333;border-radius:6px;padding:10px;margin-top:12px;height:300px;overflow-y:auto;font-size:13px;white-space:pre-wrap;word-break:break-all}
.log div{margin-bottom:4px}
.log .ok{color:#4caf50}.log .err{color:#f44336}.log .info{color:#2196f3}.log .warn{color:#ff9800}
.status{font-size:14px;margin-bottom:8px}
</style>
</head>
<body>
<h1>ugochat Diagnostic</h1>
<div class="status" id="status">Ready</div>
<div><button class="btn" onclick="runTest()">Run Test</button></div>
<div id="log" class="log"></div>
<script>
const log=document.getElementById('log');
const status=document.getElementById('status');
function add(t,m,c){const d=document.createElement('div');d.className=c||'';d.textContent=(new Date().toLocaleTimeString())+' '+t;log.appendChild(d);log.scrollTop=log.scrollHeight;}
let ws;
async function register(){
  const u='t'+Date.now();const p='123456';
  add('Registering '+u,'info');
  const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
  const d=await r.json();
  if(!d.ok){add('Register FAIL: '+d.error,'err');return null;}
  add('Registered: '+u+' token:'+d.token.substring(0,20)+'...','ok');
  return {u,p,t:d.token};
}
async function wsTest(cred){
  return new Promise(resolve=>{
    ws=new WebSocket('wss://'+location.host+'/chat?token='+encodeURIComponent(cred.t));
    ws.onopen=()=>{
      add('WS OPEN','ok');
      setTimeout(()=>{
        ws.send(JSON.stringify({type:'message',text:'Hello from test',ts:Date.now()}));
        setTimeout(()=>{ws.close();},500);
      },800);
    };
    ws.onmessage=e=>{try{const m=JSON.parse(e.data);add('MSG: '+m.type,'info');}catch(e){add('RAW: '+e.data,'warn');}};
    ws.onclose=()=>{add('WS CLOSE','warn');resolve();};
    ws.onerror=()=>{add('WS ERROR','err');resolve();};
    setTimeout(()=>{if(ws.readyState<2){ws.close();resolve();}},5000);
  });
}
async function runTest(){
  log.innerHTML='';
  status.textContent='Testing...';
  try {
    const c=await register();
    if(!c){status.textContent='FAIL';return;}
    await wsTest(c);
    status.textContent='PASS - check green logs above';
  } catch(e){status.textContent='ERROR: '+e.message;}
}
</script>
</body>
</html>`;

export const ABOUT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>About ugochat</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;min-height:100vh;display:flex;flex-direction:column;align-items:center}
.nav{position:sticky;top:0;background:#1a73e8;width:100%;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:14px}
.nav .brand{font-size:16px;font-weight:600;cursor:pointer}
.nav a{color:#fff;opacity:.85;text-decoration:none;padding:3px 10px;border-radius:12px;background:rgba(255,255,255,.1)}
.nav a:hover{opacity:1;background:rgba(255,255,255,.2)}
.lang-btn{cursor:pointer;background:rgba(255,255,255,.15);border:none;color:#fff;padding:3px 10px;border-radius:12px;font-size:13px}
.wrap{max-width:720px;width:100%;padding:32px 20px}
h1{font-size:26px;color:#1a1a1a;margin-bottom:20px;text-align:center}
h2{font-size:18px;color:#333;margin:24px 0 12px}
p{color:#555;line-height:1.7;font-size:15px;margin-bottom:12px}
.features{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
.feat{background:#fff;padding:16px;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,.06)}
.feat h3{font-size:15px;color:#1a73e8;margin-bottom:6px}
.feat p{font-size:13px;color:#666;margin:0}
.steps{background:#fff;padding:20px;border-radius:10px;margin:12px 0}
.step{margin-bottom:14px;display:flex;align-items:flex-start;gap:12px}
.step-num{background:#1a73e8;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:14px}
.step-text{font-size:14px;color:#555;line-height:1.5;padding-top:4px}
.cta{text-align:center;margin:24px 0}
.cta a{display:inline-block;background:#1a73e8;color:#fff;padding:12px 32px;border-radius:24px;text-decoration:none;font-size:16px;font-weight:600}
.cta a:hover{background:#1557b0}
.footer{text-align:center;font-size:12px;color:#999;padding:20px 0}
</style>
</head>
<body>
<nav class="nav">
<span class="brand" onclick="location.href='/'">&#128172; ugochat</span>
<div>
<a href="/">Chat</a>
<a href="/about">About</a>
<a href="/pricing">Pricing</a>
<button class="lang-btn" id="lngBtn" onclick="usgLang()">EN</button>
</div>
</nav>
<div class="wrap" id="content"></div>
<div class="footer">ugochat &copy; 2026 | <a href="mailto:ugo2000@126.com">ugo2000@126.com</a></div>
<script>
const ZH=String.fromCharCode(96)+\`<h1>About ugochat</h1>
<h2>What is ugochat?</h2>
<p>ugochat is a free online chat platform for meeting strangers worldwide. Chat anonymously with random people for fun, venting, or just passing time.</p>
<h2>Why use ugochat?</h2>
<div class="features">
<div class="feat"><h3>&#127968; Anonymous</h3><p>No account needed for random chat. No social pressure.</p></div>
<div class="feat"><h3>&#128172; Real-time</h3><p>Instant messaging with strangers. No delay.</p></div>
<div class="feat"><h3>&#127918; Fun</h3><p>Meet interesting people from around the world randomly.</p></div>
<div class="feat"><h3>&#128129; Safe Space</h3><p>Vent freely. Your conversations are private between participants.</p></div>
<div class="feat"><h3>&#128227; Social Relief</h3><p>Great for shy people, loneliness, or social anxiety. Practice with strangers first.</p></div>
<div class="feat"><h3>&#128275; Privacy</h3><p>No connection to your real identity. Chat without awkwardness.</p></div>
</div>
<h2>How it works</h2>
<div class="steps">
<div class="step"><div class="step-num">1</div><div class="step-text">Register a free account (or use existing). 100 free messages included.</div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Join group chat to talk with everyone, or start a random chat to meet one stranger.</div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">Send private messages to specific users or keep chatting randomly.</div></div>
<div class="step"><div class="step-num">4</div><div class="step-text">Run out of free messages? Upgrade to unlimited for a small fee.</div></div>
</div>
<h2>About Random Chat</h2>
<p>Our random chat feature matches you with a stranger. Say hi, chat about anything, and if you want to meet someone new, just tap "Next" to find another stranger. No awkwardness, no connections, just pure conversation.</p>
<h2>Contact</h2>
<p>Questions or feedback? Email us at <a href="mailto:ugo2000@126.com">ugo2000@126.com</a></p>
<div class="cta"><a href="/">Start Chatting Now</a></div>\`;
const EN=String.fromCharCode(96)+\`<h1>About ugochat</h1>
<h2>What is ugochat?</h2>
<p>ugochat is a free online chat platform for meeting strangers worldwide. Chat anonymously with random people for fun, venting, or just passing time.</p>
<h2>Why use ugochat?</h2>
<div class="features">
<div class="feat"><h3>&#127968; Anonymous</h3><p>No account needed for random chat. No social pressure.</p></div>
<div class="feat"><h3>&#128172; Real-time</h3><p>Instant messaging with strangers. No delay.</p></div>
<div class="feat"><h3>&#127918; Fun</h3><p>Meet interesting people from around the world randomly.</p></div>
<div class="feat"><h3>&#128129; Safe Space</h3><p>Vent freely. Your conversations are private between participants.</p></div>
<div class="feat"><h3>&#128227; Social Relief</h3><p>Great for shy people, loneliness, or social anxiety. Practice with strangers first.</p></div>
<div class="feat"><h3>&#128275; Privacy</h3><p>No connection to your real identity. Chat without awkwardness.</p></div>
</div>
<h2>How it works</h2>
<div class="steps">
<div class="step"><div class="step-num">1</div><div class="step-text">Register a free account (or use existing). 100 free messages included.</div></div>
<div class="step"><div class="step-num">2</div><div class="step-text">Join group chat to talk with everyone, or start a random chat to meet one stranger.</div></div>
<div class="step"><div class="step-num">3</div><div class="step-text">Send private messages to specific users or keep chatting randomly.</div></div>
<div class="step"><div class="step-num">4</div><div class="step-text">Run out of free messages? Upgrade to unlimited for a small fee.</div></div>
</div>
<h2>About Random Chat</h2>
<p>Our random chat feature matches you with a stranger. Say hi, chat about anything, and if you want to meet someone new, just tap "Next" to find another stranger. No awkwardness, no connections, just pure conversation.</p>
<h2>Contact</h2>
<p>Questions or feedback? Email us at <a href="mailto:ugo2000@126.com">ugo2000@126.com</a></p>
<div class="cta"><a href="/">Start Chatting Now</a></div>\`;
function usgLang(){const cur=document.getElementById('content').innerHTML===ZH?'zh':'en';const next=cur==='zh'?'en':'zh';document.getElementById('content').innerHTML=next==='zh'?ZH:EN;document.getElementById('lngBtn').textContent=next==='zh'?'\u4E2D':'EN';localStorage.setItem('tinychat_lang',next);}
(function(){const l=localStorage.getItem('tinychat_lang')||'en';document.getElementById('content').innerHTML=l==='zh'?ZH:EN;document.getElementById('lngBtn').textContent=l==='zh'?'\u4E2D':'EN';})();
</script>
</body>
</html>`;

export const PRICING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>ugochat Pricing</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;min-height:100vh;display:flex;flex-direction:column;align-items:center}
.nav{position:sticky;top:0;background:#1a73e8;width:100%;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;color:#fff;font-size:14px}
.nav .brand{font-size:16px;font-weight:600;cursor:pointer}
.nav a{color:#fff;opacity:.85;text-decoration:none;padding:3px 10px;border-radius:12px;background:rgba(255,255,255,.1)}
.nav a:hover{opacity:1;background:rgba(255,255,255,.2)}
.lang-btn{cursor:pointer;background:rgba(255,255,255,.15);border:none;color:#fff;padding:3px 10px;border-radius:12px;font-size:13px}
.wrap{max-width:720px;width:100%;padding:32px 20px}
h1{font-size:26px;color:#1a1a1a;margin-bottom:24px;text-align:center}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.card{background:#fff;border-radius:12px;padding:24px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06);transition:transform .2s}
.card:hover{transform:translateY(-2px)}
.card.popular{border:2px solid #ff9800;background:#fff8e1}
.card .tag{display:inline-block;background:#1a73e8;color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;margin-bottom:8px}
.card.popular .tag{background:#ff9800}
.card h3{font-size:18px;color:#333;margin-bottom:8px}
.card .price{font-size:32px;font-weight:700;color:#1a73e8;margin:8px 0}
.card .price span{font-size:14px;font-weight:400;color:#999}
.card .desc{font-size:13px;color:#666;margin-bottom:16px}
.card .btn{display:inline-block;background:#1a73e8;color:#fff;padding:10px 24px;border-radius:20px;text-decoration:none;font-size:14px}
.card.popular .btn{background:#ff9800}
.faq h2{font-size:18px;color:#333;margin:24px 0 12px;text-align:center}
.faq-item{background:#fff;border-radius:10px;padding:16px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.faq-item h4{font-size:14px;color:#333;margin-bottom:6px}
.faq-item p{font-size:13px;color:#666;line-height:1.5}
.footer{text-align:center;font-size:12px;color:#999;padding:20px 0}
</style>
</head>
<body>
<nav class="nav">
<span class="brand" onclick="location.href='/'">&#128172; ugochat</span>
<div>
<a href="/">Chat</a>
<a href="/about">About</a>
<a href="/pricing">Pricing</a>
<button class="lang-btn" id="lngBtn" onclick="usgLang()">EN</button>
</div>
</nav>
<div class="wrap" id="content"></div>
<div class="footer">ugochat &copy; 2026</div>
<script>
const ZH=String.fromCharCode(96)+\`<h1>Pricing</h1>
<div class="cards">
<div class="card">
<div class="tag">FREE</div>
<h3>Free</h3>
<div class="price">&#165;0</div>
<div class="desc">100 free messages. No time limit.</div>
<a class="btn" href="/">Get Started</a>
</div>
<div class="card popular">
<div class="tag">BEST VALUE</div>
<h3>Yearly</h3>
<div class="price">&#165;299<span>/year</span></div>
<div class="desc">Unlimited messages. Best value. Approx &#165;25/month.</div>
<a class="btn" href="/">Buy Now</a>
</div>
<div class="card">
<h3>Lifetime</h3>
<div class="price">&#165;499</div>
<div class="desc">Pay once, use forever. Unlimited messages permanently.</div>
<a class="btn" href="/">Buy Once</a>
</div>
<div class="card">
<h3>Monthly</h3>
<div class="price">&#165;29.9<span>/month</span></div>
<div class="desc">Unlimited messages. Cancel anytime.</div>
<a class="btn" href="/">Subscribe</a>
</div>
</div>
<div class="faq">
<h2>FAQ</h2>
<div class="faq-item"><h4>What happens when free quota runs out?</h4><p>You can purchase a plan to unlock unlimited messaging. Your free 100 messages never expire.</p></div>
<div class="faq-item"><h4>How does payment work?</h4><p>We use WeChat Pay / Alipay. Admin reviews your payment and activates your account manually (usually within minutes).</p></div>
<div class="faq-item"><h4>Can I cancel monthly subscription?</h4><p>Yes, just stop purchasing next month. No auto-renewal.</p></div>
</div>\`;
const EN=String.fromCharCode(96)+\`<h1>Pricing</h1>
<div class="cards">
<div class="card">
<div class="tag">FREE</div>
<h3>Free</h3>
<div class="price">$0</div>
<div class="desc">100 free messages. No time limit.</div>
<a class="btn" href="/">Get Started</a>
</div>
<div class="card popular">
<div class="tag">BEST VALUE</div>
<h3>Yearly</h3>
<div class="price">$41<span>/year</span></div>
<div class="desc">Unlimited messages. Best value. Approx $3.4/month.</div>
<a class="btn" href="/">Buy Now</a>
</div>
<div class="card">
<h3>Lifetime</h3>
<div class="price">$69</div>
<div class="desc">Pay once, use forever. Unlimited messages permanently.</div>
<a class="btn" href="/">Buy Once</a>
</div>
<div class="card">
<h3>Monthly</h3>
<div class="price">$4.1<span>/month</span></div>
<div class="desc">Unlimited messages. Cancel anytime.</div>
<a class="btn" href="/">Subscribe</a>
</div>
</div>
<div class="faq">
<h2>FAQ</h2>
<div class="faq-item"><h4>What happens when free quota runs out?</h4><p>You can purchase a plan to unlock unlimited messaging. Your free 100 messages never expire.</p></div>
<div class="faq-item"><h4>How does payment work?</h4><p>We use WeChat Pay / Alipay. Admin reviews your payment and activates your account manually (usually within minutes).</p></div>
<div class="faq-item"><h4>Can I cancel monthly subscription?</h4><p>Yes, just stop purchasing next month. No auto-renewal.</p></div>
</div>\`;
function usgLang(){const cur=document.getElementById('content').innerHTML===ZH?'zh':'en';const next=cur==='zh'?'en':'zh';document.getElementById('content').innerHTML=next==='zh'?ZH:EN;document.getElementById('lngBtn').textContent=next==='zh'?'\u4E2D':'EN';localStorage.setItem('tinychat_lang',next);}
(function(){const l=localStorage.getItem('tinychat_lang')||'en';document.getElementById('content').innerHTML=l==='zh'?ZH:EN;document.getElementById('lngBtn').textContent=l==='zh'?'\u4E2D':'EN';})();
</script>
</body>
</html>`;
