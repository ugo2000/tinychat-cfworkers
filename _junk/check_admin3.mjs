import('./src/html.js').then(m => {
  const A = m.ADMIN_HTML;
  const sMatch = A.match(/<script>([\s\S]*?)<\/script>/);
  const code = sMatch[1];
  try { new Function(code); console.log('SCRIPT PARSE: OK'); }
  catch(e) { console.log('SCRIPT PARSE FAIL:', e.message); }
  console.log('has doLogin:', code.includes('function doLogin'));
  console.log('has loadPending:', code.includes('function loadPending'));
  console.log('has approvePay:', code.includes('function approvePay'));
});
