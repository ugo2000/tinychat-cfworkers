import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// Count </script> occurrences
const count1 = (bundle.match(/<\/script>/g) || []).length;
console.log('Bare </script> in bundle:', count1);

// Extract the main HTML template
const re = /^const HTML = (.*?);$/sm;
const m = bundle.match(re);
if (!m) { console.log('Cannot find HTML const'); process.exit(1); }
// It's a JSON string literal - eval to get the string
let htmlVal;
try { htmlVal = eval('(' + m[1] + ')'); } catch(e) { console.log('eval fail:', e.message); process.exit(1); }
console.log('HTML val length:', htmlVal.length);

// Count </script> in the actual HTML value
const count2 = (htmlVal.match(/<\/script>/g) || []).length;
console.log('</script> in HTML:', count2);

// Show all </script> positions
let pos = 0;
let i = 0;
while ((pos = htmlVal.indexOf('</script>', pos)) >= 0) {
  i++;
  console.log('</script> #' + i + ' at pos', pos, ':', JSON.stringify(htmlVal.substring(pos - 30, pos + 20)));
  pos += 8;
}

// Extract script the same way the check did
const s = htmlVal.indexOf('<script>');
const e = htmlVal.indexOf('</script>');
console.log('\nFirst <script> at:', s, ', first </script> at:', e, 'diff:', e - s - 8);
if (s >= 0 && e >= 0) {
  console.log('Extracted script length:', e - s - 8);
}
