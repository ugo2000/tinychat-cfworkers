import { readFileSync, writeFileSync } from 'fs';

// The key insight: esbuild's JSX/HTML parser sees </script> in template literals
// during the bundling pass (when it concatenates all files before parsing).
// The standard fix: use string concatenation in the template literal itself.
// In a template literal, `</scr` + `ipt>` evaluates to the string "</script>"
const s = readFileSync('src/html.js', 'utf8');
const before = (s.match(/<\/script>/g) || []).length;
console.log('Before: </script> count =', before);

// Replace </script> with string concatenation
// This works because in a template literal: `...</scr${""}ipt>` evaluates to "...</script>"
// But the simpler approach: use </scr" + "ipt> which in template literal context gives </script>
const fixed = s.replace(/<\/script>/g, '</scr" + "ipt>');

const after = (fixed.match(/<\/script>/g) || []).length;
console.log('After: </script> count =', after);
writeFileSync('src/html.js', fixed);
console.log('Written. Size:', fixed.length);

// Verify
const verify = readFileSync('src/html.js', 'utf8');
const plain = (verify.match(/<\/script>/g) || []).length;
const concat = (verify.match(/<\/scr" \+ "ipt>/g) || []).length;
console.log('Verify - plain </script>:', plain);
console.log('Verify - concat pattern: ', concat);
