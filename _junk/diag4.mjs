import('./src/html.js').then(m => {
  const A = m.ADMIN_HTML;
  const sMatch = A.match(/<script>([\s\S]*?)<\/script>/);
  const code = sMatch[1];
  // Show lines 43-50
  const lines = code.split('\n');
  for (let i = 43; i < 50; i++) {
    console.log(`L${i+1} raw bytes:`, JSON.stringify(lines[i]));
  }
});
