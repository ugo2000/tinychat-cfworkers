import('./src/html.js').then(m => {
  const A = m.ADMIN_HTML;
  const sMatch = A.match(/<script>([\s\S]*?)<\/script>/);
  const code = sMatch[1];
  try { new Function(code); console.log('SCRIPT PARSE: OK'); }
  catch(e) { console.log('SCRIPT PARSE FAIL:', e.message); }
  console.log('has doLogin:', code.includes('function doLogin'));
  console.log('has loadQR:', code.includes('function loadQR'));
  console.log('has uploadQR:', code.includes('function uploadQR'));
  console.log('auto-login removed:', !code.includes('doLogin()'));
  console.log('loadQR has try-catch (should be NO):', code.includes('function loadQR(){try'));
});