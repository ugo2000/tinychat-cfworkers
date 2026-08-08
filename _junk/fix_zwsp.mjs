import { readFileSync, writeFileSync } from 'fs';

// Use Zero-Width Space (U+200B) to break </script> without changing rendered output
// HTML parser collapses ZWSP, browser renders </script> correctly
// But esbuild's string search for </script> won't match because ZWSP interrupts it
// In JS string: </scri + ZWSP + pt> → rendered as </script>
// In search: </script is NOT found (ZWSP is between i and p)
const ZWSP = '\u200B';

let html = readFileSync('src/html_src.js', 'utf8');
console.log('Original size:', html.length);

// Replace </script> with </scri{ZWSP}pt>
html = html.replace(/<\/script>/gi, '</scri' + ZWSP + 'pt>');

// Fix nested template literals (ZH=` and EN=` in ABOUT/PRICING)
html = html.replace(/const ZH=`/g, 'const ZH=String.fromCharCode(96)+`');
html = html.replace(/const EN=`/g, 'const EN=String.fromCharCode(96)+`');

writeFileSync('src/html.js', html);
console.log('Fixed size:', html.length);

// Verify: search for </script> (should be 0)
const scriptCount = (html.match(/<\/script>/gi) || []).length;
console.log('</script> count:', scriptCount);

// Verify: check ZWSP usage
const zwspCount = (html.match(/\u200B/g) || []).length;
console.log('ZWSP count:', zwspCount);
console.log('Has ZWSP in script:', html.includes('scri' + ZWSP + 'pt>'));
