import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const src = readFileSync(base + 'src/html_src.js', 'utf8');
let pos = 0, count = 0, positions = [];
while ((pos = src.indexOf('<\/script>', pos)) >= 0) { count++; pos += 10; }
console.log('Escaped <\/script>:', count);
pos = 0; count = 0;
while ((pos = src.indexOf('</script>', pos)) >= 0) {
  count++;
  positions.push(pos);
  pos += 9;
}
console.log('Bare </script>:', count);
positions.forEach((p, i) => console.log('BARE #' + (i + 1) + ' at ' + p + ':', JSON.stringify(src.substring(p - 20, p + 30))));

// Also check the admin script area for the onclick attribute
const adminIdx = src.indexOf('ADMIN_HTML');
if (adminIdx >= 0) {
  // Find onclick='approvePay in admin section
  const onclickIdx = src.indexOf("onclick='approvePay", adminIdx);
  if (onclickIdx >= 0) {
    console.log('\nonclick approvePay at:', onclickIdx);
    console.log('Context:', JSON.stringify(src.substring(onclickIdx - 50, onclickIdx + 150)));
  }
  // Check for </script> within admin section
  const adminEnd = src.indexOf('PRICING_HTML', adminIdx);
  const adminSlice = src.substring(adminIdx, adminEnd);
  const adminScripts = [];
  pos = 0;
  while ((pos = adminSlice.indexOf('</script>', pos)) >= 0) { adminScripts.push(pos); pos += 9; }
  console.log('\n</script> in ADMIN_HTML section:', adminScripts.length);
  adminScripts.forEach(p => console.log('  at admin offset', p, ':', JSON.stringify(adminSlice.substring(p - 20, p + 30))));
}
