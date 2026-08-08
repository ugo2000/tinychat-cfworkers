import('./src/html.js').then(m => {
  const A = m.ADMIN_HTML;
  const sMatch = A.match(/<script>([\s\S]*?)<\/script>/);
  const code = sMatch[1];
  const lines = code.split('\n');
  // Try to find the problematic line by removing one at a time
  for (let i = lines.length - 1; i >= 0; i--) {
    const testCode = lines.filter((_, idx) => idx !== i).join('\n');
    try { new Function(testCode); console.log('CLEAN - removed line', i+1, ':', lines[i].trim().substring(0, 80)); break; }
    catch(e) { if (i === 0) console.log('STILL FAIL even at line 0'); }
  }
});
