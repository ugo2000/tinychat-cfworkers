import { readFileSync, writeFileSync } from 'fs';
let html = readFileSync('src/html.js', 'utf8');

// Fix nested template literals: const ZH=` and const EN=` inside ABOUT/PRICING
// These are nested template literals inside the main HTML template
// Solution: use String.fromCharCode(96) for the inner backtick
// Pattern: "const ZH=`" -> "const ZH=String.fromCharCode(96)+`"
// Actually: replace "=`" after "const ZH" or "const EN" with "=String.fromCharCode(96)+`"
// But this would also match things like "<a href=`...`" - we need to be specific
// Better: replace the specific patterns with escaped backtick variant

// The specific patterns are:
// const ZH=` -> const ZH=String.fromCharCode(96)+`
// const EN=` -> const EN=String.fromCharCode(96)+`
html = html.replace(/const ZH=`/g, 'const ZH=String.fromCharCode(96)+`');
html = html.replace(/const EN=`/g, 'const EN=String.fromCharCode(96)+`');

writeFileSync('src/html.js', html);
console.log('Fixed nested templates');
console.log('ZH=String:', html.includes('const ZH=String.fromCharCode(96)+`'));
console.log('EN=String:', html.includes('const EN=String.fromCharCode(96)+`'));
console.log('Total lines:', html.split('\n').length);
