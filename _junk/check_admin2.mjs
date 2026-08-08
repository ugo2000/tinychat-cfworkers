import('./src/html.js').then(m => {
  const A = m.ADMIN_HTML;
  // Extract just the <script>...</script> block
  const sMatch = A.match(/<script>([\s\S]*?)<\/script>/);
  if (!sMatch) { console.log('NO SCRIPT TAG FOUND'); return; }
  const code = sMatch[1];
  console.log('script length:', code.length);
  // Count control chars
  let bad = 0, samples = [];
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    if (c < 9 || (c > 13 && c < 32)) {
      bad++;
      if (samples.length < 10) samples.push(i + ':U+' + c.toString(16).padStart(4,'0'));
    }
  }
  console.log('non-printable control chars:', bad, samples);
  // Try to parse
  try { new Function(code); console.log('SCRIPT PARSE: OK'); }
  catch(e) { console.log('SCRIPT PARSE FAIL:', e.message); }
  // Search for actual newlines
  const newlines = (code.match(/\n/g) || []).length;
  console.log('LF count in script:', newlines);
});