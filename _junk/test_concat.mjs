import { readFileSync, writeFileSync } from 'fs';

// Test the replacement strategy
// Pattern: </scr${''}ipt>
// In a template literal: `...</scr${''}ipt>` evaluates to "...</script>"
// Let's verify with a test

// Test 1: ${''} pattern
const test1 = `Hello</scr${''}ipt>World`;
console.log('Test1 result:', test1, '| equals </script>:', test1 === 'Hello</script>World');

// Test 2: String concatenation in template literal
const test2 = `Hello</scr` + `ipt>World`;
console.log('Test2 result:', test2, '| equals </script>:', test2 === 'Hello</script>World');

// Now apply to html.js
const s = readFileSync('src/html.js', 'utf8');
const before = (s.match(/<\/script>/g) || []).length;
console.log('\nBefore: </script> count =', before);

// Apply the ${''} pattern
const fixed = s.replace(/<\/script>/g, '</scr${""}ipt>');

const after = (fixed.match(/<\/script>/g) || []).length;
console.log('After: </script> count =', after);

writeFileSync('src/html.js', fixed);
console.log('Written. Size:', fixed.length);

// Verify the pattern is correct
const pattern = '</scr${""}ipt>';
const count = (fixed.match(/<\/scr\$\{""\}ipt>/g) || []).length;
console.log('${""} pattern count:', count);
