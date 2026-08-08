import('./src/html.js').then(m => {
  const A = m.ADMIN_HTML;
  const sMatch = A.match(/<script>([\s\S]*?)<\/script>/);
  const code = sMatch[1];
  const lines = code.split('\n');
  // Show lines 10-15 with their raw byte content
  for (let i = 10; i < 16 && i < lines.length; i++) {
    console.log(`L${i+1} (len=${lines[i].length}): ${lines[i].substring(0, 200)}`);
  }
});