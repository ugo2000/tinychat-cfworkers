import { execSync } from 'child_process';

const pages = ['/', '/admin', '/test', '/about', '/pricing'];
for (const p of pages) {
  const url = 'https://chathub.asia' + p;
  try {
    const html = execSync('curl.exe -s ' + url, { encoding: 'utf8' });
    const s = html.indexOf('<script>');
    const split = html.indexOf("</scr'+'ipt>");
    const real = html.indexOf('</script>');
    const hasSplit = split >= 0;
    const hasReal = real >= 0;
    let status = '';
    if (s >= 0) {
      const e = hasSplit ? split : (hasReal ? real : -1);
      if (e > s) {
        const script = html.substring(s + 8, e);
        try {
          new Function(script);
          status = '✅ script OK (len ' + script.length + ')';
        } catch(err) {
          status = '❌ script ERROR: ' + err.message;
        }
      } else {
        status = '⚠️ no close tag found';
      }
    } else {
      status = '(no script tag)';
    }
    console.log(p.padEnd(10), 'len=' + html.length, 'splitClose=' + hasSplit, 'realClose=' + hasReal, status);
  } catch(e) {
    console.log(p.padEnd(10), '❌ fetch error:', e.message);
  }
}
