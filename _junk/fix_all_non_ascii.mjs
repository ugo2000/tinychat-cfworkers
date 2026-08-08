import { readFileSync, writeFileSync } from 'fs';

// Fix: Replace non-ASCII characters with ASCII equivalents in all source files
const files = ['src/index.js', 'src/wechat.js'];
for (const file of files) {
  const s = readFileSync(file, 'utf8');
  // Replace non-ASCII (Chinese chars, GBK chars, etc.) in comments with English
  // Strategy: replace all non-printable and non-ASCII with safe ASCII
  let fixed = s.replace(/[^\x00-\x7F]/g, (ch) => {
    const code = ch.charCodeAt(0);
    // Map common Chinese punctuation to ASCII equivalents
    if (code === 0x3002) return '.';  // 。
    if (code === 0xFF01) return '!';  // ！
    if (code === 0xFF0C) return ',';  // ，
    if (code === 0x3001) return ',';  // 、
    if (code === 0xFF1A) return ':';  // ：
    if (code === 0x2018) return "'";  // '
    if (code === 0x2019) return "'";  // '
    if (code === 0x201C) return '"';  // "
    if (code === 0x201D) return '"';  // "
    if (code === 0x300C) return '"';  // "
    if (code === 0x300D) return '"';  // "
    if (code === 0xFF08) return '(';  // （
    if (code === 0xFF09) return ')';  // ）
    if (code === 0x3010) return '[';  // 【
    if (code === 0x3011) return ']';  // 】
    if (code === 0x300A) return '<';  // 《
    if (code === 0x300B) return '>';  // 》
    if (code === 0x300E) return '"';  // "
    if (code === 0x300F) return '"';  // "
    // Skip other Chinese chars (replace with space in comments)
    return '?';
  });
  
  // Clean up double spaces from replacements
  fixed = fixed.replace(/\s{2,}/g, ' ');
  
  const beforeNonAscii = (s.match(/[^\x00-\x7F]/g) || []).length;
  const afterNonAscii = (fixed.match(/[^\x00-\x7F]/g) || []).length;
  console.log(`${file}: non-ASCII ${beforeNonAscii} -> ${afterNonAscii}, size ${s.length} -> ${fixed.length}`);
  
  writeFileSync(file, fixed);
}
console.log('Done.');
