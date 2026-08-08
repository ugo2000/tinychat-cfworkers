import { readFileSync, writeFileSync } from 'fs';
let html = readFileSync('src/html.js', 'utf8');

// Replace </script> with </scr/*test*/ipt> to defeat esbuild's HTML scanner
// At runtime: </scr + /*test*/ + ipt> = </script>
// In the source: "*/" ends the comment, so </scr/*test*/ipt> has:
// - </scr
// - /*test*/
// - ipt>
// - > does NOT follow ipt directly (they're separated by */)
// The scanner looking for </script will find </scr but NOT </script
// (because </script requires the > to immediately follow "script")
html = html.replace(/<\/script>/g, '</scr/*-->*/ipt>');
writeFileSync('src/html.js', html);
console.log('Fixed with comment split');

// Verify
const s = html;
console.log('Has </script>:', s.includes('</script>'));
console.log('Has </scr/*:', s.includes('</scr/*'));
console.log('Total size:', s.length);
