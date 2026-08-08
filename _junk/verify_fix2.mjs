import { readFileSync } from 'fs';
const s = readFileSync('src/html.js', 'utf8');
// Find ALL occurrences of </script
const matches = [];
let idx = s.indexOf('</script');
while (idx >= 0) {
  matches.push({pos: idx, text: s.substring(idx, idx + 20)});
  idx = s.indexOf('</script', idx + 1);
}
console.log('Total </script* occurrences:', matches.length);
matches.forEach((m, i) => console.log(i, 'pos:', m.pos, 'text:', JSON.stringify(m.text)));
// What does the replacement look like?
const replacement = String.raw`</scr${''}ipt>`;
const replIdx = s.indexOf(replacement);
console.log('\nReplacement at:', replIdx);
if (replIdx >= 0) console.log('Repl context:', JSON.stringify(s.substring(replIdx, replIdx + 30)));
