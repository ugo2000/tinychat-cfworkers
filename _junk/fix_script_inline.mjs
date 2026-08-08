import { readFileSync, writeFileSync } from 'fs';
let html = readFileSync('src/html.js', 'utf8');

// Replace </script> with a concatenation trick that defeats esbuild's scanner
// Using String.fromCharCode trick: </scr${""}ipt>
// This creates the string "</script>" at runtime but esbuild doesn't see the literal
// However, we also need to escape the </scr${""}ipt> itself inside template literals
// The trick: </scr${""}ipt> inside template literal = JS expression
// esbuild still sees </scr... as containing </script>... UNLESS we escape more
// 
// Real fix: use HTML entities inside the template literal that decode to </script>
// </&#115;cript> or </&#x3C;/script> won't work inside template literal
// 
// Best fix: break up </scRIPT> with case variation
// esbuild does case-insensitive match for </script>
// </SC RIPT> would work but we can't have space in HTML
// 
// Actually: the </scr${""}ipt> DOES work! The issue is just escaping it in the output.
// When template literal evaluates: </scr${""}ipt> -> </script>
// Let's verify by writing a test
writeFileSync('test_template.js', `export default {
  fetch() { return new Response(\`<div></scr\${""}ipt></div>\`); }
};`);
console.log('Test file written');
console.log('Contains literal </scr:', html.includes('</scr'));
