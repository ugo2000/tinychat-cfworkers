import { readFileSync, writeFileSync } from 'fs';
const f = 'src/html.js';
let html = readFileSync(f, 'utf8');
const lines = html.split('\n');

// Remove lines 906-1131 (0-indexed: 905-1130) - the first old set + orphaned approvePay
// Lines 1-905 = main HTML + its exports (KEEP)
// Lines 906-1131 = old ABOUT+PRICING+old HTML code + orphaned approvePay (REMOVE)
// Lines 1132+ = second complete set (KEEP)
const keep = [...lines.slice(0, 905), ...lines.slice(1131)];
console.log('Original:', lines.length, '-> Keep:', keep.length, '(removed', lines.length - keep.length, ')');

writeFileSync(f, keep.join('\n'), 'utf8');

// Verify structure
const lines2 = keep.join('\n').split('\n');
let inAdmin = 0, inTest = 0, inAbout = 0, inPricing = 0;
lines2.forEach((l, i) => {
  if (l.match(/^const ADMIN_HTML/)) { console.log('ADMIN_HTML at L' + (i+1)); inAdmin++; }
  if (l.match(/^const TEST_HTML/)) { console.log('TEST_HTML at L' + (i+1)); inTest++; }
  if (l.match(/^const ABOUT_HTML/)) { console.log('ABOUT_HTML at L' + (i+1)); inAbout++; }
  if (l.match(/^const PRICING_HTML/)) { console.log('PRICING_HTML at L' + (i+1)); inPricing++; }
});
console.log('Total:', lines2.length, 'inAdmin:', inAdmin, 'inTest:', inTest, 'inAbout:', inAbout, 'inPricing:', inPricing);

const lastLine = lines2[lines2.length-1];
console.log('Last line:', lastLine.substring(0, 80));
console.log('done');
