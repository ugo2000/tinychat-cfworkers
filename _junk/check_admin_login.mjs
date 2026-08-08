import('./src/html.js').then(m => {
  const A = m.ADMIN_HTML;
  console.log('ADMIN_HTML length:', A.length);
  try { new Function(A); console.log('PARSE: OK'); }
  catch(e) { console.log('PARSE FAIL:', e.message); }
  console.log('has doLogin:', A.includes('function doLogin'));
  console.log('has adminPwd:', A.includes('adminPwd'));
  console.log('has btnLogin:', A.includes('id="btnLogin"'));
  console.log('has onclick doLogin():', A.includes('onclick="doLogin()"'));
  console.log('has uploadQR:', A.includes('uploadQR'));
  console.log('has loadQR:', A.includes('loadQR'));
  let bad = 0, samples = [];
  for (let i = 0; i < A.length; i++) {
    const c = A.charCodeAt(i);
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) {
      bad++;
      if (samples.length < 5) samples.push(i + ':U+' + c.toString(16).padStart(4,'0'));
    }
  }
  console.log('control chars (excl tab/LF/CR):', bad, samples);
  const di = A.indexOf('function doLogin');
  if (di > 0) console.log('doLogin region:', A.substring(di, di+400));
});