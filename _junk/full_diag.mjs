import { readFileSync } from 'fs';

// Check all source files for encoding issues
const files = ['src/index.js', 'src/html.js', 'src/wechat.js'];
for (const file of files) {
  const s = readFileSync(file, 'utf8');
  const buf = Buffer.from(s, 'utf8');
  
  // Check for BOM
  const hasBom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  
  // Check for invalid UTF-8 sequences (bytes that shouldn't appear in valid UTF-8)
  let invalidCount = 0;
  const invalidPositions = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    // Check for bare high bytes (0x80-0xBF) without proper leading byte
    if (b >= 0x80 && b <= 0xBF) {
      // Check if it's a valid continuation byte (should follow a leading byte)
      const prev = i > 0 ? buf[i-1] : 0;
      const validContinuation = (prev >= 0xC0 && prev <= 0xDF) || (prev >= 0xE0 && prev <= 0xEF) || (prev >= 0xF0 && prev <= 0xF7);
      if (!validContinuation) {
        invalidCount++;
        if (invalidPositions.length < 5) {
          invalidPositions.push({pos: i, byte: b, context: s.substring(Math.max(0,i-10), i+10)});
        }
      }
    }
  }
  
  // Check for U+FFFD
  const fffd = (s.match(/\uFFFD/g) || []).length;
  
  console.log(`\n${file}:`);
  console.log(`  Size: ${s.length}, BOM: ${hasBom}`);
  console.log(`  Invalid bytes: ${invalidCount}`);
  console.log(`  U+FFFD: ${fffd}`);
  if (invalidPositions.length > 0) {
    invalidPositions.forEach(p => console.log(`    pos ${p.pos} byte 0x${p.byte.toString(16)}: "${p.context}"`));
  }
}
