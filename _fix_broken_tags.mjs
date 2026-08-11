import { readFileSync, writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const content = readFileSync(base + 'src/html_src.js', 'utf8');

// Strategy: inside template literals, use string concatenation to split </script>
// so HTML parser never sees it as a tag
// e.g. <scr`+`ipt> won't match <script>
// The JS code in the template does the same thing
// Actually the simplest: just escape </script> as <`+`/script>
// Wait, that's still in template literal and would be literal text in the rendered page
// 
// REAL FIX: Use template literal concatenation: `<` + `/script>`
// This renders as '<' + '/script>' = '</script>' in the DOM text content
// But since it goes through JS string evaluation, the browser won't see it as HTML
//
// Even simpler: just replace with a comment that prevents HTML parser detection
// The HTML parser sees: </scr<!-- -->ipt> - no valid tag name, skips
// JS sees: </scr/* */ipt> - comment is stripped, </script> remains in JS string
// Actually no, that's wrong too
//
// CORRECT: The only reliable way to prevent HTML parser from closing <script>
// is to split the '<' character: '<' + '/script>'
// In the rendered page, this JS code produces the string '</script>'
// The HTML parser only sees: <script>...text content...'<' + '/script>'... </script>
// The '<' + '/script>' is JavaScript code, not HTML text
//
// BUT: Our templates contain HTML page source (with <script> tags INSIDE strings)
// The template content IS the page HTML, so </script> in the template content
// IS seen by HTML parser as closing tag
//
// Best approach for template literals: use String.fromCharCode
// String.fromCharCode(60) = '<', String.fromCharCode(47) = '/'
// <scr${String.fromCharCode(96)}ipt> where 96 = '`' -- WRONG
// <scr${String.fromCharCode(96)}ipt> renders as <scr`ipt> (not </script>)
// <${String.fromCharCode(47)}script> renders as </script> but the '<' is JS
// The HTML parser sees text starting with '<${...}' -- not a tag start
// Since it starts with '<$' it's not a valid tag, HTML parser ignores it
// Wait, does the parser see '${...}' as part of the text or as JS?
// No, we're INSIDE a template literal. The ${...} is evaluated at JS compile time.
// The RESULT of the template literal is a plain string with the evaluated content.
// So the result string is: page HTML with </script> intact
// When this string is assigned to innerHTML or document.write,
// the HTML parser sees the page HTML and parses </script> as closing tag
//
// The ONLY reliable ways to prevent </script> from closing the script tag:
// 1. Split with string concatenation: '<' + '/script>'
// 2. Use String.fromCharCode for '<' or '/'
// 3. Escape it as HTML entity &#60;
// But &#60; is decoded by innerHTML parser, giving '<'
//
// For innerHTML: the parser decodes HTML entities before executing JS
// So &#60; becomes '<' and closes the tag
//
// SOLUTION for innerHTML: use String.fromCharCode at RUNTIME
// <scr${String.fromCharCode(96)}ipt> where 96 = '`'
// This gives <scr`ipt> in the string - not </script>
// But we NEED </script> in the JS string
//
// Actually the RIGHT solution is known from real-world projects:
// Split the slash: <\/script> where \/ is NOT an HTML escape
// In the DOM string, this appears as </script>
// But the HTML parser sees <\/script> (backslash before slash)
// When looking for closing tag, HTML parser specifically looks for
// U+003C ('<') followed by U+002F ('/') (ASCII slash)
// With a backslash between them, it's not recognized
//
// In a JS template literal: `<script>var x = '<\\/script>'</script>`
// The source has: `<script>var x = '<\\/script>'</script>`
// The string value is: '<\\/script>' (with literal backslash)
// Wait, is `\/` a recognized escape? No. So `\/` = '\' + '/' = '\\' + '/'? No.
// In JS strings, \/ = '/' (it's an allowed escape, equivalent to /)
// Yes! In JS, \/ is defined as an escape for '/' (for JSON/compatibility)
// So '<\\/script>' as JS string = '</script>'
// When innerHTML sets this, HTML parser sees </script> (backslash is gone)
// 
// Let's verify: in JS, \/ in string literal is decoded as '/'
// So the HTML parser sees </script> and closes the tag
//
// OK I give up on escaping. Let's use a different approach:
// Instead of embedding page HTML in template literals,
// use String.raw to prevent ALL escapes, then handle </script> specially.
//
// Or: use a TWO-STAGE approach:
// Stage 1: extract page HTML to a separate .html file (no JS wrapping)
// Stage 2: read that file, manually replace </script> with String.raw`<\/script>`
// The String.raw prevents any processing, giving us the literal text </script>
// 
// Actually the SIMPLEST working solution used by many projects:
// Replace </script> with <\/scr'+'ipt> in the template literal
// This splits the closing tag across a JS concatenation, so HTML parser
// doesn't see it as a closing tag during parsing
//
// Let me just try: </scr'+'ipt>
// In template: </scr'+'ipt>
// HTML parser sees: </scr'+ (text) + 'ipt> (more text)
// Not a valid closing tag, so it doesn't close
// JS evaluates: </scr'+'ipt> = '</scr'+'ipt>' = '</script>'
// Result: correct string in JS, no HTML parser confusion
//
// Let's use this approach
const broken = '</scr${""}ipt>';

// Use string concatenation to split </script>
// The JS concatenation </scr'+'ipt> renders as '</scr'+'ipt>' = '</script>' 
// But HTML parser sees </scr'+ (not a valid tag close) + 'ipt> (more text)
// Never sees the complete </script> sequence
const fixed = "</scr'+'ipt>";

const count = (content.match(/<\/scr\$\{""\}ipt>/g) || []).length;
console.log('Found', count, 'broken tags');

const result = content.split(broken).join(fixed);

const remaining = (result.match(/<\/scr\$\{""\}ipt>/g) || []).length;
console.log('Remaining broken:', remaining);

writeFileSync(base + 'src/html_src.js', result, 'utf8');
console.log('Written. Length:', result.length);

// Verify with full pipeline
const htmlSrc = readFileSync(base + 'src/html_src.js', 'utf8');
const mod = await import('data:text/javascript;base64,' + Buffer.from(htmlSrc).toString('base64'));

for (const [name, html] of Object.entries(mod)) {
  if (typeof html !== 'string') continue;
  const s = html.indexOf('<script>');
  const e = html.indexOf('</script>');
  if (s < 0 || e < 0) { console.log(name, ': NO SCRIPT TAG'); continue; }
  const script = html.substring(s + 8, e);
  try {
    new Function(script);
    console.log(name + ' script: new Function OK, len=' + script.length);
  } catch(err) {
    console.log(name + ' script: ERROR -', err.message);
  }
}
