import { readFileSync, writeFileSync } from 'fs';
let html = readFileSync('src/html.js', 'utf8');

// FIX: break </script> into </scr + ${"ipt>"}
// This ensures NO literal occurrence of </script (case-insensitive) in source
// At runtime: "</scr" + "ipt>" = "</script>"
html = html.replace(/<\/script>/g, '</scr${"ipt>"}');

writeFileSync('src/html.js', html);
console.log('Fixed');

const s = html;
const hasUnescaped = s.includes('</script>') || s.toLowerCase().includes('</scr');
console.log('Has unescaped </script:>', hasUnescaped);
console.log('Has </scr$:', s.includes('</scr${'));
