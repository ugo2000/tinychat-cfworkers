import('./src/html.js').then(m => {
  const A = m.ADMIN_HTML;
  const sMatch = A.match(/<script>([\s\S]*?)<\/script>/);
  const code = sMatch[1];
  // Show the 10 lines around line 47 (0-indexed)
  const lines = code.split('\n');
  for (let i = 43; i < 55; i++) {
    console.log(`L${i+1}:`, lines[i]);
  }
});
