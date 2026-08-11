import { readFileSync, writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const content = readFileSync(base + 'src/html_src.js', 'utf8');

// Fix 1: Replace &#60;/script&#62; with <\/script>
const fixed1 = content.replace(/&#60;\/script&#62;/g, '<\\/script>');
const c1 = (fixed1.match(/&#60;\/script&#62;/g) || []).length;
console.log('Fixed &#60; tags:', c1);

// Fix 2: Replace the broken </scr${""}ipt> if still present
const broken = (fixed1.match(/<\/scr\$\{""\}ipt>/g) || []).length;
if (broken > 0) {
  console.log('Still have broken tags:', broken);
  // This is already </scr${""}ipt> which splits the tag - might work
}

// Now verify each template by extracting the HTML from the bundle
// We'll run build_final.mjs to get the bundle, then extract and test
writeFileSync(base + 'src/html_src.js', fixed1, 'utf8');
console.log('Written. Length:', fixed1.length);

// Count </script> and <\/script> in the source
let pos = 0, count = 0, countEsc = 0;
while ((pos = fixed1.indexOf('</script>', pos)) >= 0) { count++; pos += 9; }
pos = 0;
while ((pos = fixed1.indexOf('<\\/script>', pos)) >= 0) { countEsc++; pos += 10; }
console.log('Bare </script>:', count);
console.log('Escaped <\\/script>:', countEsc);
