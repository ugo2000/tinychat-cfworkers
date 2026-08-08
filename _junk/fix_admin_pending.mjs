import { readFileSync, writeFileSync } from 'fs';
const f = 'src/html.js';
let html = readFileSync(f, 'utf8');

// Add loadPending and approvePay functions after uploadQR, before fmt
const loadPending = `async function loadPending(){const area=document.getElementById('pendingArea');try{const r=await fetch('/admin/pay-pending?pwd='+encodeURIComponent(PWD));const d=await r.json();if(!d.pending){area.innerHTML='<span style="font-size:13px;color:#888">加载失败</span>';return;}if(d.pending.length===0){area.innerHTML='<span style="font-size:13px;color:#888">暂无待确认付款</span>';return;}const labels={'once':'一次性（¥499）','sub':'月度（¥29.9）','sub_year':'年度（¥299）'};area.innerHTML=d.pending.map(p=>'<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee"><span><b>'+esc(p.username)+'</b> · '+esc(labels[p.pkg]||p.pkg)+'<br><small style="color:#888">'+fmt(p.ts)+'</small></span><button style="background:#07c160;color:#fff;border:none;padding:5px 14px;border-radius:6px;cursor:pointer" onclick="approvePay(\\''+p.username+'\\',\\''+p.pkg+'\\')">确认开通</button></div>').join('');}catch(e){area.innerHTML='<span style="font-size:13px;color:#c00">加载失败: '+esc(e.message)+'</span>';}}
async function approvePay(username,pkg){if(!confirm('确认已收到 '+username+' 的付款（'+pkg+'）？开通后无法撤销。'))return;try{const r=await fetch('/admin/pay-approve?pwd='+encodeURIComponent(PWD),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,pkg})});const d=await r.json();if(d.ok){loadPending();}else{alert('操作失败: '+(d.error||'未知错误'));}}catch(e){alert('操作失败: '+e.message);}}
`;

const afterUploadQR = `async function uploadQR(){`;
const idx = html.indexOf(afterUploadQR);
if (idx < 0) { console.log('uploadQR not found'); process.exit(1); }
// find end of uploadQR function
const funcEnd = html.indexOf('\n}', idx);
if (funcEnd < 0) { console.log('uploadQR end not found'); process.exit(1); }
// insert after the closing brace of uploadQR
const insertAt = funcEnd + 1;
html = html.slice(0, insertAt) + '\n' + loadPending + html.slice(insertAt);

// Call loadPending after doLogin success (after loadQR())
html = html.replace(
  'loadQR();}}).catch',
  'loadQR();loadPending();}}).catch'
);

// Call loadPending after doLogin success in login form (after doLogin)
html = html.replace(
  'loadQR();}}).catch',
  'loadQR();loadPending();}}).catch'
);

writeFileSync(f, html, 'utf8');
console.log('done, added loadPending/approvePay');
