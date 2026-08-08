import { readFileSync, writeFileSync } from 'fs';

// Use Zero-Width Space (U+200B = 0xE2808B in UTF-8) to break </script>
// In JS string: \u200B = U+200B character
// HTML browser collapses ZWSP, renders as </script>
// esbuild scanner looking for </script won't match (ZWSP breaks sequence)

let html = readFileSync('src/html_src.js', 'utf8');
console.log('Original size:', html.length);

// Insert ZWSP between 'scri' and 'pt' in </script>
// </scri + ZWSP + pt> = </scri\u200Bpt> in memory, rendered as </script> by browser
// esbuild scanner: </scri\u200Bpt> does NOT match </script>
const ZWSP = '\u200B';
console.log('ZWSP code point:', ZWSP.charCodeAt(0)); // Should be 8203

const original = html;
html = html.replace(/<\/script>/gi, (match) => {
  return '</scri' + ZWSP + 'pt>';
});

console.log('Replacement done');
console.log('Changed:', html !== original);

// Verify
const scriptCount = (html.match(/<\/script>/gi) || []).length;
console.log('</script> count:', scriptCount);

// Check for ZWSP
const zwspIndex = html.indexOf(ZWSP);
console.log('ZWSP found at index:', zwspIndex);

// Check bytes at the replacement location
const bytes = Buffer.from(html.substring(html.indexOf('</scri'), html.indexOf('</scri') + 20), 'utf8');
console.log('Bytes after replacement:', bytes.toString('hex'));

writeFileSync('src/html.js', html);
console.log('Written to file, final size:', html.length);

// Double-check the written file
const written = readFileSync('src/html.js', 'utf8');
const writtenZwsp = written.indexOf(ZWSP);
console.log('ZWSP in written file:', writtenZwsp >= 0);
