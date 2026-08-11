import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');

// The HTML value starts at char 21 (after 'const HTML = "')
// Find where the HTML value ends (the closing ")
let pos = 22; // start after opening "
let inString = true;
while (pos < bundle.length && inString) {
  const ch = bundle[pos];
  if (ch === '\\') { pos += 2; continue; }
  if (ch === '"') { inString = false; break; }
  pos++;
}
const htmlVal = bundle.substring(22, pos);
console.log('HTML value length:', htmlVal.length);

// Count script tags
const starts = (htmlVal.match(/<script>/g) || []).length;
const ends = (htmlVal.match(/<\/script>/g) || []).length;
const hexEscaped = (htmlVal.match(/\\x3c\/script>/g) || []).length;
console.log('In HTML value: <script>:', starts, '</script>:', ends, '\\x3c/script>:', hexEscaped);

// Now check the raw source HTML templates
const htmlSrc = readFileSync(base + 'src/html_src.js', 'utf8');
const lines = htmlSrc.split('\n');
// Lines 593, 824, 889, 988, 1112 should be the closing tags
for (const ln of [593, 824, 889, 988, 1112]) {
  console.log('\nLine', ln, ':', JSON.stringify(lines[ln - 1]));
}

// Find what escapeScriptEnd is looking for vs what we have
// escapeScriptEnd looks for literal </script> in the HTML VALUE
// But in our source, the tags are <\\/script> in the JS template literal
// So the VALUE of the template literal is: the string with <\\/script>
// \/ in JS string = '/' (it's an escape sequence)
console.log('\n\nChecking JS string escape:');
console.log('Test <\\/script>:', JSON.stringify('<\\/script>')); // JS interprets \/ as /
console.log('JSON.stringify of <\\/script>:', JSON.stringify('<\\/script>'));
// When this goes through JSON.stringify in build_final.mjs, the \/ becomes \\
// because JSON.stringify escapes / as \/ — wait, no, JSON \/ is allowed as unescaped
// Actually JSON.stringify('</script>') = '"</script>"' — no extra escaping needed for /
// But the source has <\\/script> which is the JS string '</script>'
// So the template VALUE is '</script>' (single backslash-slash)
// JSON.stringify preserves this as "</script>" (no extra escaping for /)
// In the bundle, the string literal "<\/script>" — the \/ is the JS escape for /
// So the string VALUE is '</script>' (the actual script close tag)
// This gets output in the HTML as: </script>
// Which closes the HTML script tag!

console.log('\nRoot cause: <\\/script> in JS template literal = </script> string value');
console.log('This </script> in HTML string content closes the HTML <script> tag!');
