import { readFileSync, writeFileSync } from 'fs';

const idxSrc = readFileSync('src/index_src.js', 'utf8');
let htmlSrc = readFileSync('src/html_src.js', 'utf8');
let wxSrc = readFileSync('src/wechat_src.js', 'utf8');

// Step 1: Fix </script> -> <\/script>
htmlSrc = htmlSrc.replace(/<\/script>/gi, '<\\/script>');
wxSrc = wxSrc.replace(/<\/script>/gi, '<\\/script>');

// Step 2: Replace String.fromCharCode(96)+` with real backtick
htmlSrc = htmlSrc.replace(/String\.fromCharCode\(96\)\+\x60/g, '\x60');

// Step 3: Extract templates
// Strategy: find "const NAME = " then skip to the next `
// (accounting for possible whitespace/newlines between = and `)
function extractTemplates(src) {
  const results = {};
  const names = ['HTML', 'ADMIN_HTML', 'TEST_HTML', 'ABOUT_HTML', 'PRICING_HTML'];
  
  for (const name of names) {
    // Find the declaration
    const declPattern = new RegExp(`(?:export\\\\s+)?const\\\\s+${name}\\\\s*=\\\\s*\x60`);
    const declMatch = src.match(declPattern);
    if (!declMatch) { console.log('NOT FOUND:', name); continue; }
    
    const afterDecl = declMatch.index + declMatch[0].length; // right after opening `
    let outerDepth = 1; // we're inside the template
    let inExpr = false;
    let exprDepth = 0;
    
    for (let i = afterDecl; i < src.length; i++) {
      const ch = src[i];
      const ch2 = src[i] + (src[i+1] || '');
      const ch3 = src[i] + (src[i+1] || '') + (src[i+2] || '');
      
      if (inExpr) {
        if (ch3 === '${') { exprDepth++; }
        else if (ch === '}') { exprDepth--; if (exprDepth === 0) inExpr = false; }
      } else {
        if (ch3 === '${') { inExpr = true; exprDepth = 1; }
        else if (ch === '`') {
          outerDepth--;
          if (outerDepth === 0) {
            results[name] = src.substring(afterDecl, i);
            break;
          }
        }
      }
    }
    
    if (results[name]) {
      console.log(`${name}: ${results[name].length} chars`);
    } else {
      console.log('ERROR: unmatched for', name);
    }
  }
  
  return results;
}

const tpl = extractTemplates(htmlSrc);

// Step 4: Escape backticks and ${ in extracted content
const tplEscaped = {};
for (const [name, content] of Object.entries(tpl)) {
  const escaped = content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
  tplEscaped[name] = escaped;
}

// Step 5: Clean wechat
let wxClean = wxSrc.replace(/^export\s+/gm, '').replace(/^export\s+async\s+/gm, '');

// Step 6: Build bundle
let bundle = idxSrc;
bundle = bundle
  .replace(/^import\s+.*?from\s+['"]\.\/html\.js['"];?\s*$/m, '')
  .replace(/^import\s+.*?from\s+['"]\.\/wechat\.js['"];?\s*$/m, '');

bundle = bundle.replace(
  /(const\s+SECRET\s*=\s*new\s+TextEncoder\(\)\.encode\(['"][^'"]+['"]\)[^;]*;)/,
  (m) => m + '\n' + wxClean
);

const htmlDecls = [
  `const HTML = \`${tplEscaped.HTML}\`;`,
  `const ADMIN_HTML = \`${tplEscaped.ADMIN_HTML}\`;`,
  `const TEST_HTML = \`${tplEscaped.TEST_HTML}\`;`,
  `const ABOUT_HTML = \`${tplEscaped.ABOUT_HTML}\`;`,
  `const PRICING_HTML = \`${tplEscaped.PRICING_HTML}\`;`,
].join('\n') + '\n';

bundle = bundle.replace(
  /^export\s+default\s*\{/m,
  htmlDecls + '\nexport default {'
);

// Step 7: Verify
const scCount = (bundle.match(/<\/script>/gi)||[]).length;
console.log('\nBare </script>:', scCount);
console.log('Size:', bundle.length);
console.log('Has handlePayApprove:', bundle.includes('handlePayApprove'));
console.log('Has payPending:', bundle.includes('payPending'));
console.log('Has uploadQR:', bundle.includes('uploadQR'));

// Step 8: Key section check
const lines = bundle.split('\n');
let edLine = -1, zhLine = -1, htmlLine = -1;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l === 'export default {') edLine = i + 1;
  if (l === 'const ZH=`;') zhLine = i + 1;
  if (l === '</html>`;') htmlLine = i + 1;
}
console.log(`\nexport default: L${edLine}, const ZH: L${zhLine}, </html>: L${htmlLine}`);
if (edLine < 0 || zhLine < 0 || htmlLine < 0) {
  console.log('ERROR: Missing key sections');
} else if (htmlLine > edLine) {
  console.log('ERROR: export default appears before </html> (outer template not closed)');
}

writeFileSync('dist/index.js', bundle);
console.log('\nWritten dist/index.js');
