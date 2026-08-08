import { readFileSync, writeFileSync } from 'fs';
const f = 'src/html.js';
let html = readFileSync(f, 'utf8');

// Fix loadPending: use data-username data-pkg instead of inline onclick
const oldLoadPending = html.match(/async function loadPending\(\)\{const area=document\.getElementById\('pendingArea'\);try\{const r=await fetch\('\/admin\/pay-pending\?pwd='\+encodeURIComponent\(PWD\)\);const d=await r\.json\(\);if\(!d\.pending\)\{area\.innerHTML='<span[^>]*>加载失败<\/span>';\s*return;\s*\}if\(d\.pending\.length===0\)\{area\.innerHTML='<span[^>]*>暂无[^<]*<\/span>';\s*return;\s*\}const labels=\{'once'[^}]+\};area\.innerHTML=d\.pending\.map\(p=>'<div[^>]*><span><b>'[^;]+;[^}]+\}catch\(e\)\{[^}]+\}\}/s)?.[0];

// Find the actual loadPending function block
const loadPendingStart = html.indexOf('async function loadPending(){');
if (loadPendingStart < 0) { console.log('loadPending not found'); process.exit(1); }
const loadPendingEnd = html.indexOf('\n}', loadPendingStart);
const loadPendingBlock = html.slice(loadPendingStart, loadPendingEnd + 1);

// Build fixed version
const newLoadPending = `async function loadPending(){const area=document.getElementById('pendingArea');try{const r=await fetch('/admin/pay-pending?pwd='+encodeURIComponent(PWD));const d=await r.json();if(!d.pending){area.innerHTML='<span style="font-size:13px;color:#888">加载失败</span>';return;}if(d.pending.length===0){area.innerHTML='<span style="font-size:13px;color:#888">暂无待确认付款</span>';return;}const labels={'once':'一次性（¥499）','sub':'月度（¥29.9）','sub_year':'年度（¥299）'};area.innerHTML=d.pending.map(p=>'<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee"><span><b>'+esc(p.username)+'</b> · '+esc(labels[p.pkg]||p.pkg)+'<br><small style="color:#888">'+fmt(p.ts)+'</small></span><button class="approveBtn" data-user="'+esc(p.username)+'" data-pkg="'+esc(p.pkg)+'">确认开通</button></div>').join('');}catch(e){area.innerHTML='<span style="font-size:13px;color:#c00">加载失败: '+esc(e.message)+'</span>';}}
document.addEventListener('click',function(e){if(e.target.classList.contains('approveBtn')){approvePay(e.target.dataset.user,e.target.dataset.pkg);}});
`;

html = html.slice(0, loadPendingStart) + newLoadPending + html.slice(loadPendingEnd + 1);

// Fix approvePay: remove the confirm (admin already knows they clicked it)
const approvePayStart = html.indexOf('async function approvePay(');
const approvePayEnd = html.indexOf('\n}', approvePayStart);
html = html.slice(0, approvePayStart) + `async function approvePay(username,pkg){try{const r=await fetch('/admin/pay-approve?pwd='+encodeURIComponent(PWD),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,pkg})});const d=await r.json();if(d.ok){loadPending();}else{alert('操作失败: '+(d.error||'未知错误'));}}catch(e){alert('操作失败: '+e.message);}}
` + html.slice(approvePayEnd + 1);

writeFileSync(f, html, 'utf8');
console.log('done');
