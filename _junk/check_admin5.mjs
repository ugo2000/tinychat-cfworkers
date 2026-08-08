import('./src/html.js').then(m => {
  const A = m.ADMIN_HTML;
  const sMatch = A.match(/<script>([\s\S]*?)<\/script>/);
  const code = sMatch[1];
  const lines = code.split('\n');
  console.log('FULL L11:', lines[10]);
  console.log('---');
  console.log('FULL L12:', lines[11].substring(0, 300) + '...');
});