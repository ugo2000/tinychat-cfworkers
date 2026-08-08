import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');

// Try parsing just the first 5000 chars
const chunk = s.substring(0, 5000);
try {
  new Function(chunk);
  console.log('First 5000 chars: OK');
} catch(e) {
  console.log('First 5000 chars ERROR:', e.message.substring(0, 150));
  const pos = e.message.match(/at position (\d+)/);
  if (pos) console.log('At pos:', parseInt(pos[1]), 'Snippet:', JSON.stringify(chunk.substring(Math.max(0,parseInt(pos[1])-20), parseInt(pos[1])+40)));
}

// Try wrapping in IIFE with return
const chunk2 = '(function(){const BAD_WORDS = [];\n' + chunk.substring(0, 1000) + '})';
try {
  new Function(chunk2);
  console.log('Wrapped first 1000: OK');
} catch(e) {
  console.log('Wrapped first 1000 ERROR:', e.message.substring(0, 150));
}

// Find the HTML template section
const htmlStart = s.indexOf('// === HTML Templates ===');
const htmlEnd = s.indexOf('export default {');
console.log('HTML section:', htmlStart, '-', htmlEnd);

// Try parsing just the HTML section
if (htmlStart >= 0 && htmlEnd > htmlStart) {
  const htmlSection = s.substring(htmlStart, htmlEnd);
  const wrapped = '(function(){' + htmlSection + '})';
  try {
    new Function(wrapped);
    console.log('HTML section: OK');
  } catch(e) {
    console.log('HTML section ERROR:', e.message.substring(0, 200));
    const pos = e.message.match(/at position (\d+)/);
    if (pos) {
      const absPos = htmlStart + parseInt(pos[1]);
      console.log('At abs pos:', absPos, 'Snippet:', JSON.stringify(s.substring(Math.max(0,absPos-30), absPos+60)));
    }
  }
}
