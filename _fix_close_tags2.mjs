import { readFileSync, writeFileSync } from 'fs';
const p = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js';
let src = readFileSync(p, 'utf8');
const before = (src.match(/<\/scr'\+'ipt>/g) || []).length;
src = src.split("</scr'+'ipt>").join('</script>');
const after = (src.match(/<\/script>/g) || []).length;
writeFileSync(p, src);
console.log('replaced split tags:', before, '-> real </script> count now:', after);
console.log('remaining split tags:', (src.match(/<\/scr'\+'ipt>/g) || []).length);

// Verify each template now ends with </script></body></html>
const templates = ['HTML', 'ADMIN_HTML', 'TEST_HTML', 'ABOUT_HTML', 'PRICING_HTML'];
for (const t of templates) {
  const m = new RegExp('export const ' + t + ' = `').exec(src);
  if (!m) { console.log(t + ': NOT FOUND'); continue; }
  const start = m.index;
  const endIdx = src.indexOf('`;', start);
  const body = src.substring(start, endIdx);
  const closeIdx = body.lastIndexOf('</script>');
  const tail = body.substring(closeIdx);
  console.log(t + ': tail =', JSON.stringify(tail.substring(0, 40)));
}
