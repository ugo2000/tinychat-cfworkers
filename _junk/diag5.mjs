import('./src/html.js').then(m => {
  const A = m.ADMIN_HTML;
  const sMatch = A.match(/<script>([\s\S]*?)<\/script>/);
  const code = sMatch[1];
  // Find the problematic approvePay in onclick
  const idx = code.indexOf('onclick="approvePay');
  if (idx >= 0) {
    console.log('onclick found at', idx);
    console.log('raw bytes:', JSON.stringify(code.slice(idx, idx+60)));
  }
  // Try parsing after removing just the onclick line
  const lines = code.split('\n');
  const onclickLineIdx = lines.findIndex(l => l.includes('onclick="approvePay'));
  if (onclickLineIdx >= 0) {
    const testCode = lines.filter((_, i) => i !== onclickLineIdx).join('\n');
    try { new Function(testCode); console.log('REMOVED onclick line: PARSE OK'); }
    catch(e) { console.log('REMOVED onclick line: STILL FAIL', e.message); }
  }
});
