import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');

// Test: what causes "Unexpected identifier 'ugochat'"?
// Is it the </scr in the template literal?
const hasScriptInTemplate = s.includes('</scri');
console.log('Has </scri:', hasScriptInTemplate);

// Test parsing the content without the export default wrapper
// Wrap in IIFE
const wrapped = '(function(){' + s + '})';
try {
  new Function(wrapped);
  console.log('IIFE parse: OK');
} catch(e) {
  console.log('IIFE parse ERROR:', e.message.substring(0, 200));
  // Find where in the file
  const match = e.message.match(/at position (\d+)/);
  if (match) {
    const pos = parseInt(match[1]);
    console.log('Error at pos:', pos, 'Snippet:', JSON.stringify(s.substring(Math.max(0,pos-20), pos+60)));
  }
}

// Also try a minimal template with </script>
const testCode = "const t = `</scri${''}pt>`;";
try {
  new Function(testCode);
  console.log('Minimal template test: OK');
} catch(e) {
  console.log('Minimal template ERROR:', e.message);
}
