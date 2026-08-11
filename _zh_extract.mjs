import { readFileSync, writeFileSync } from 'fs';
const src = readFileSync('src/html_src.js', 'utf8');
// Extract the HTML template's zh/en objects (inside the big template string)
// Find 'const zh = {' and 'const en = {' within the HTML
const zhIdx = src.indexOf('const zh = {');
const enIdx = src.indexOf('const en = {');
if (zhIdx < 0 || enIdx < 0) { console.log('not found'); process.exit(1); }
const zhBlock = src.slice(zhIdx, enIdx);
writeFileSync('_zh_block.txt', zhBlock, 'utf8');
// Also extract live html zh
const live = readFileSync('_live.html', 'utf8');
const lzh = live.indexOf('const zh = {');
const len = live.indexOf('const en = {');
if (lzh >= 0 && len >= 0) {
  const liveZh = live.slice(lzh, len);
  writeFileSync('_live_zh_block.txt', liveZh, 'utf8');
  console.log('zh blocks identical:', zhBlock === liveZh);
}
console.log('zh block length:', zhBlock.length);
