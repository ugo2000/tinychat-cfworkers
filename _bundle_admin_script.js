
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
    const q=u.quota===-1?'∞':u.quota;
    const reg=new Date(u.createdAt).toLocaleString();
    tr.innerHTML='<td>'+esc(u.username)+'</td><td>'+(u.email||'-')+'</td><td>'+reg+'</td><td>'+q+'</td><td>'+(u.online?'🟢':'-')+'</td>';
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
  const csv='﻿'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
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
    const base64=e.target.result.split(',')[1];
    try {
      const r=await fetch('/api/pay-qr?pwd='+encodeURIComponent(PWD),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,data:base64})});
      if(r.ok){loadQR();alert('Uploaded!');}else{alert('Failed');}
    } catch(e){alert('Error: '+e.message);}
  };
  reader.readAsDataURL(file);
}
async function loadPending(){
  try {
    const r=await fetch('/api/pay-pending?pwd='+encodeURIComponent(PWD));
    if(!r.ok)return;
    const d=await r.json();
    const area=document.getElementById('pendingArea');
    area.innerHTML='';
    if(!d.pending||d.pending.length===0){area.innerHTML='<p style="font-size:13px;color:#999">No pending requests</p>';return;}
    d.pending.forEach(p=>{
      const div=document.createElement('div');
      div.className='pend-item';
      div.innerHTML='<span><b>'+esc(p.username)+'</b> - '+esc(p.pkg||'')+' ('+new Date(p.ts).toLocaleString()+')</span><button onclick='approvePay(""+esc(p.username)+"",""+esc(p.pkg||'')+"")'>Approve</button>';
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
