import { readFileSync } from 'fs';

const BASE = 'C:\\Users\\Administrator\\.qclaw\\workspace-agent-7ac59ebd\\chat-app-workers';
const idxSrc = readFileSync(BASE + '/src/index_src.js', 'utf8');

// Debug step by step
console.log('=== Step 1: Original ===');
let lines = idxSrc.split('\n');
console.log('Total lines:', lines.length);

console.log('\n=== Step 2: Remove comments ===');
const cleanLines = lines.filter(line => !line.trim().startsWith('//'));
let clean = cleanLines.join('\n');
console.log('After comment removal:', clean.split('\n').length, 'lines');

// Find import lines
const importHtml = "import HTML, { ADMIN_HTML, TEST_HTML, ABOUT_HTML, PRICING_HTML } from './html.js';";
const importWx = "import { isConfigured as wxConfigured, buildCtx as wxCtx, wechatUnifiedOrder as wxOrder, decryptResource as wxDecrypt, verifyNotify as wxVerify } from './wechat.js';";
console.log('importHtml found?', clean.includes(importHtml));
console.log('importWx found?', clean.includes(importWx));

console.log('\n=== Step 3: Remove imports ===');
let afterImports = clean.split('\n').filter(l => l.trim() !== importHtml && l.trim() !== importWx).join('\n');
console.log('After import removal:', afterImports.split('\n').length, 'lines');
let d = 0;
for (const ch of afterImports) { if (ch === '{') d++; else if (ch === '}') d--; }
console.log('Balance after import removal:', d);

// Check the extra } at end
const lastLines = afterImports.split('\n').slice(-5);
console.log('\nLast 5 lines of afterImports:');
lastLines.forEach((l, i) => console.log('  ' + l));

// Check SECRET line
const secretLine = afterImports.split('\n').find(l => l.includes('SECRET') && l.includes('TextEncoder'));
console.log('\nSECRET line:', secretLine);

// Check what's removed by SECRET regex
const regex = /(const\s+SECRET\s*=\s*new\s+TextEncoder\(\)\.encode\(['"][^'"]+['"]\)[^;]*;)/;
const match = afterImports.match(regex);
console.log('SECRET regex match:', match ? match[0] : 'NOT FOUND');
if (match) {
  const before = afterImports.split(regex)[0];
  const after = afterImports.split(regex).slice(2).join(regex.source);
  let bd = 0; for (const ch of before) { if (ch === '{') bd++; else if (ch === '}') bd--; }
  let ad = 0; for (const ch of after) { if (ch === '{') ad++; else if (ch === '}') ad--; }
  console.log('Before SECRET balance:', bd);
  console.log('After SECRET balance:', ad);
}
