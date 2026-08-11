import { readFileSync } from 'fs';
const src = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');
console.log('file length:', src.length);

// Find all split-close tags
let idx = 0, count = 0;
const positions = [];
while ((idx = src.indexOf("</scr'+'ipt>", idx)) !== -1) {
  positions.push(idx);
  count++;
  idx += 12;
}
console.log('split close tags count:', count);
positions.forEach(p => {
  const ctx = src.substring(Math.max(0, p - 60), p + 40).replace(/\n/g, '\\n');
  console.log('  @' + p + ': ...' + ctx + '...');
});

// Also check for any literal </script> already present
let c2 = 0, i2 = 0;
while ((i2 = src.indexOf('</script>', i2)) !== -1) { c2++; i2 += 9; }
console.log('real </script> tags in src:', c2);

// Check for <\\/script> (escaped in template string -> <\/script>)
let c3 = 0, i3 = 0;
while ((i3 = src.indexOf('<\\\\/script>', i3)) !== -1) { c3++; i3 += 12; }
console.log('escaped <\\\\/script> tags in src:', c3);

// Check inside script bodies for literal </script> occurrences that need escaping
// (i.e., after a <script> open tag and before the close tag)
let c4 = 0, i4 = 0;
while ((i4 = src.indexOf('</script>', i4)) !== -1) { c4++; i4 += 9; }
console.log('raw </script> count:', c4);
