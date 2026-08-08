import { readFileSync, writeFileSync } from 'fs';

// Start from backup
let html = readFileSync('src/html_src.js', 'utf8');
console.log('Starting from backup, size:', html.length);

// Step 1: Replace </script> with comment-split version
// This defeats esbuild's HTML scanner (which is case-insensitive for </script>)
html = html.replace(/<\/script>/gi, '</scr/*-->*/ipt>');

// Step 2: Fix nested template literals (ZH=` and EN=` in ABOUT/PRICING)
html = html.replace(/const ZH=`/g, 'const ZH=String.fromCharCode(96)+`');
html = html.replace(/const EN=`/g, 'const EN=String.fromCharCode(96)+`');

writeFileSync('src/html.js', html);
console.log('Done. Final size:', html.length);

// Verify
const hasScript = html.toLowerCase().includes('</scr');
const hasScrSlash = html.includes('</scr');
console.log('Has </scr (case-insensitive):', hasScript);
console.log('Has </scr (literal):', hasScrSlash);
console.log('Has ZH=String:', html.includes('const ZH=String.fromCharCode(96)+`'));
console.log('Has EN=String:', html.includes('const EN=String.fromCharCode(96)+`'));
