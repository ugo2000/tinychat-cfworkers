import { readFileSync } from 'fs';
// Copy html_src.js to a .mjs and import it
import { pathToFileURL } from 'url';
const src = readFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/html_src.js', 'utf8');
import('data:text/javascript;base64,' + Buffer.from(src).toString('base64')).then(m => {
  console.log('Exports:', Object.keys(m));
  for (const k of Object.keys(m)) {
    if (typeof m[k] === 'string') {
      console.log(k, 'length:', m[k].length, 'has </script>:', m[k].includes('</script>'), 'has </html>:', m[k].includes('</html>'));
    }
  }
}).catch(e => console.log('IMPORT FAIL:', e.message));
