import('./src/html.js').then(m => {
  const A = m.ADMIN_HTML;
  const sMatch = A.match(/<script>([\s\S]*?)<\/script>/);
  const code = sMatch[1];
  try { new Function(code); }
  catch(e) {
    // extract line number
    const match = e.message.match(/at position (\d+)/);
    if (match) {
      const pos = parseInt(match[1]);
      console.log('error at pos', pos);
      console.log('context:', code.slice(Math.max(0,pos-100), pos+100));
    } else {
      console.log('error:', e.message);
    }
  }
});
