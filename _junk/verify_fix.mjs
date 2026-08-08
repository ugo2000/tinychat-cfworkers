import { readFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
// Count plain </script>
const plainCount = (s.split('</script>')).length - 1;
// Count replacements
const replacement = String.raw`</scr${''}ipt>`;
const replCount = (s.split(replacement)).length - 1;
console.log('Plain </script> count:', plainCount);
console.log('Replacement count:', replCount);
console.log('File size:', s.length);
// Show context of first replacement
const idx = s.indexOf(replacement);
if (idx >= 0) console.log('Replacement context:', s.substring(idx - 5, idx + replacement.length + 10));
// Show the actual bytes around position 30658
const bytes = Buffer.from(s.substring(30650, 30680), 'utf8');
console.log('Bytes at 30650-30730:', bytes.toString('utf8'));
