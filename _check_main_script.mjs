import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const htmlSrc = readFileSync(base + 'src/html_src.js', 'utf8');
const mod = await import('data:text/javascript;base64,' + Buffer.from(htmlSrc).toString('base64'));
const html = mod.HTML;

// Find the embedded script in the main HTML page
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>');
console.log('Main HTML embedded script: start=' + scriptStart + ', end=' + scriptEnd + ', len=' + (scriptEnd - scriptStart - 8));

if (scriptStart >= 0 && scriptEnd >= 0) {
  const script = html.substring(scriptStart + 8, scriptEnd);
  
  // Check for </script> inside the script
  const badPos = script.indexOf('</scr');
  console.log('</scr inside script:', badPos >= 0 ? 'FOUND at ' + badPos : 'NOT FOUND');
  if (badPos >= 0) {
    console.log('Context:', JSON.stringify(script.substring(badPos - 50, badPos + 50)));
  }
  
  // Also check for all </script> in the whole HTML (not just the first one)
  let count = 0;
  let pos = 0;
  const allPos = [];
  while ((pos = html.indexOf('</script>', pos)) >= 0) {
    allPos.push(pos);
    count++;
    pos += 9;
  }
  console.log('Total </script> in HTML:', count);
  console.log('Positions:', allPos);
}
