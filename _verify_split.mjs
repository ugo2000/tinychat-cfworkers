import { readFileSync } from 'fs';
const h = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/_home_live.html', 'utf8');
const s = h.indexOf('<script>');
console.log('script open at:', s);
console.log('real </script> idx:', h.indexOf('</script>', s));
console.log('split close idx:', h.indexOf("</scr'+'ipt>"));
const tail = h.substring(h.indexOf("</scr'+'ipt>"), h.length);
console.log('--- after split close tag (' + tail.length + ' chars) ---');
console.log(JSON.stringify(tail));

// What comes after the script block in a proper page: </script></body></html>
// If browser can't find real </script>, it treats everything as script content.
// Simulate: full script content = from <script>+8 to EOF, then try to parse
const fullScript = h.substring(s + 8);
console.log('\n--- simulate browser: parse script content to EOF ---');
try {
  new Function(fullScript);
  console.log('PARSE OK (unexpected)');
} catch (e) {
  console.log('SYNTAX ERROR:', e.message);
  const m = /position (\d+)/.exec(e.message);
  if (m) {
    const p = parseInt(m[1]);
    console.log('error near:', JSON.stringify(fullScript.substring(Math.max(0,p-30), p+30)));
  }
}
