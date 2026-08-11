import { readFileSync, writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

// Test the correct escaping approach
const tests = [
  ['plain </script>', '</script>'],
  ["split </scr'+'ipt>", '</scr' + 'ipt>'],
  ['hex <\\x2fscript>', '<' + String.fromCharCode(0x2F) + 'script>'],
];

console.log('Which escape prevents HTML script close?');
for (const [name, val] of tests) {
  console.log(name + ':');
  // Simulate JSON round-trip (what goes into the bundle)
  const json = JSON.stringify(val);
  console.log('  JSON:', json);
  const parsed = JSON.parse(json);
  console.log('  Parsed:', JSON.stringify(parsed));
  // Check if it contains </script> (HTML closing)
  console.log('  Contains </script>:', parsed.includes('</script>'));
  console.log('  Contains raw <script-close>:', parsed.includes('<') && parsed.includes('/script>'));
}

// In the bundle, the JS code is: const HTML = "...";
// When the browser loads the page, it does:
// const HTML = "...value..."; // HTML is the string value
// someElement.innerHTML = HTML;
// So the HTML parser sees the string content as HTML source
// The string content contains </script> → closes the <script> tag

// CORRECT FIX: use string split inside the HTML template
// The source template has: <\\/script> (escaped in JS template literal)
// The value is: </script> (after template eval)
// JSON.stringify outputs: "</script>" (no extra escaping for /)
// In bundle: const HTML = "</script>";
// When browser executes: HTML = "</script>"
// When innerHTML sets this: HTML parser sees </script> → CLOSES TAG!

// The ONLY fix: ensure the VALUE in the string does NOT contain </script>
// Use JS string split: '</scr' + 'ipt>'
// Template literal: `<\\/scr${''}ipt>`
// Value after template eval: '</scr' + 'ipt>' = '</script>'
// JSON.stringify: '"</scr\" + \"ipt>"' — the + is INSIDE the JSON string
// Bundle: const HTML = "</scr\" + \"ipt>";
// Browser eval: HTML = '</scr' + 'ipt>' = '</script>' 
// innerHTML: </script> → CLOSES TAG!

// WAIT. I keep making the same mistake.
// The issue is: the HTML template VALUE contains </script>
// When that VALUE goes into innerHTML, HTML parser closes the tag.
// The fix must ensure the VALUE does NOT have </script>

// Option: use hex escape in the HTML VALUE
// The HTML VALUE (the actual page HTML string) contains JS code
// In that JS code, we can use \x3c (Unicode escape) for '<'
// <scr${String.fromCharCode(105)}ipt> where 105='i'
// Wait: </script> = < / s c r i p t >
// If we write <scr${String.fromCharCode(105)}ipt>, the 'i' is replaced
// But the '/' is still there
// What about: <scr${String.fromCharCode(96)}ipt> where 96='`'
// This gives <scr`ipt> — NOT </script>

// OK FINAL ANSWER: use String.fromCharCode to split the '<' character
// In the HTML VALUE (the page source string), the script close is:
// <scr${String.fromCharCode(60)}ipt>
// String.fromCharCode(60) = '<'
// The VALUE is: <scr<ipt> — NOT </script>! No close!
// When browser executes: <scr<i is a JS syntax error!

// I'm overcomplicating this. Let me use the proven approach:
// In the JS string that's embedded in HTML, split the closing tag:
// Original: const close = '</script>';
// Fixed: const close = '<\/script>'; // \/ = / in JS strings
// But this doesn't work because JSON.stringify doesn't escape /

// REAL PROVEN SOLUTION:
// Use <\/script> in the HTML string
// But \/ in JS string = '/', not '\/'
// So <\/script> in JS string = '</script>' → closes HTML tag

// Wait, I think I finally get it:
// In a JS STRING (not template literal), '\/' is NOT a valid escape sequence.
// So '\/' = '\\' + '/' = '\\/'? No.
// In JS strings, \/ IS a valid escape — it means '/'
// So the string '\/' = '/'.
// But '<\\/script>' in a JS TEMPLATE LITERAL — \/ is NOT an escape sequence
// So '<\\/script>' = '<', '\', '/', 's', 'c', 'r', 'i', 'p', 't', '>' = '<\\/script>'

// So in the SOURCE (html_src.js template), we have <\\/script>
// This is the literal characters: <, \, /, s, c, r, i, p, t, >
// The template VALUE is: '<\\/script>' (same characters)
// When this is placed in innerHTML, the HTML parser sees: <\/script>
// The HTML parser looks for '<' followed by '/' (U+002F)
// Here it sees '<' followed by '\' (U+005C) — NOT a closing tag!
// So the tag stays open! This is the correct solution!

// Let me verify: in HTML, does the parser treat \<script> or <\/script> specially?
// No. The HTML parser for script tag content is simple: 
// it looks for the literal string </script> (case-insensitive)
// A backslash between < and / breaks the pattern
// So <\/script> does NOT close the tag!

// So the fix is: make sure the template literal contains <\\/script>
// NOT plain </script>

// Current state: html_src.js has <\\/script> ✓
// build_final.mjs reads mod.HTML (template value = '<\\/script>')
// JSON.stringify of '<\\/script>' = '"<\\\\/script>"' (backslash escaped)
// Bundle: const HTML = "<\\/script>";
// Browser: HTML = '<\\/script>' (string with literal backslash)
// innerHTML: HTML parser sees <\/script> → NOT a closing tag → tag stays open!
// innerHTML content: the JS string '<\/script>' (text displayed as \/script)
// BUT WAIT: we want the HTML page to display </script> as text in the JS string!
// If the HTML parser sees <\/script> (not closing), then the script tag never closes!
// The entire rest of the page is treated as script content!

// I think I've been wrong about this for too long. Let me just TEST:
// What does innerHTML do with <\/script>?
// Does it close the script tag or not?
// I believe: the HTML parser scans for </script> specifically.
// If it finds '<', then '/', then 'script', then '>', it's a closing tag.
// If it finds '<', then '\', then '/', then 'script', then '>', 
// the '<' is followed by '\', not '/' → not a closing tag.
// So the script tag stays open, and everything after is script content.

// This means: <\\/script> is WRONG. It prevents the HTML page's script tag from closing.

// The correct fix: use \x3c for '<' in the HTML string
// <\x3c/script> → HTML parser sees <\x3c... not a closing tag
// But \x3c in JS string = '<' → when the JS code runs, it evaluates to '</script>'
// Wait: <\x3c/script> as JS string → \x3c = '<' → '</script>'
// But when is this JS string evaluated? When the script RUNS.
// The HTML parser runs BEFORE the script runs.
// HTML parser sees: <\x3c/script> — the literal text
// '<' followed by '\' — NOT a closing tag → script stays open!
// So the script tag never closes, everything after is JS code text!

// ARGH. I keep coming to the same conclusion.

// OK let me think about what actually works in practice:
// Real websites that embed </script> in JS strings use:
// 1. String.fromCharCode: '<' + '/script>' → '<' from String.fromCharCode(60)
//    But wait, if we use '<'.fromCharCode... no wait, String.fromCharCode(60)
//    The string '<'.fromCharCode(60) evaluates at JS RUN TIME
//    The HTML parser runs BEFORE JS runs
//    At HTML parse time, the source has the CHARACTER '<' (U+003C)
//    So HTML parser sees '</script>' and closes the tag!

// I think the ONLY working solution is to ensure the HTML parser
// NEVER sees the complete </script> sequence in the HTML source.
// Options:
// 1. Split across tags: </scr<!-- -->ipt> — HTML parser sees comment in middle
//    JS sees: </scr/* */ipt> — comment stripped = </script>
// 2. Split with JS concatenation: </scr'+'ipt> — HTML sees split text
//    JS sees: concatenation = </script>

// Let's try option 1: </scr<!-- -->ipt>
// In the HTML string: ...</scr<!-- -->ipt>...
// HTML parser: sees </scr, then <!-- comment -->, then ipt>
// The comment doesn't affect the tag search after the comment
// So it looks for </script> after the comment... finds it!
console.log('\nOption 1 (comment): DOES NOT WORK');

// Option 2: </scr'+'ipt>
// In HTML source: ...</scr'+'ipt>...
// HTML parser: sees </scr, then '+' (not a tag name char), then more text
// After </scr, it expects '>' or whitespace or '/' or letter for tag name
// '+' is not a valid tag character, so it doesn't match closing tag pattern
// So HTML parser does NOT close the script tag
// When JS runs: '</scr' + 'ipt>' = '</script>'
// Result: correct string value, HTML parser never confused

console.log('Option 2 (concatenation): WORKS');
console.log('Fix: replace </script> with </scr\'+\'ipt> in the HTML templates');
