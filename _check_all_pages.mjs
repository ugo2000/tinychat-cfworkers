import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';

// Fetch the actual HTTP response bytes
const html = execSync('curl.exe -s https://chathub.asia/', { encoding: 'utf8', maxBuffer: 1024 * 1024 });
const admin = execSync('curl.exe -s https://chathub.asia/admin', { encoding: 'utf8', maxBuffer: 1024 * 1024 });

writeFileSync(base + '_home_live.html', html, 'utf8');
writeFileSync(base + '_admin_live.html', admin, 'utf8');

function analyzePage(name, html) {
  console.log('\n=== ' + name + ' ===');
  console.log('Total length:', html.length);
  
  // Count occurrences of various patterns
  const patterns = [
    ['<script>', '<script>'],
    ['</script>', '</script>'],
    ["</scr'+'ipt>", "</scr'+'ipt>"],
    ['<scr\'+"+"ipt>', "<scr'+'ipt>"],
    ['<\\/script>', '<\\/script>'],
    ['<x>', '<x>'],
  ];
  
  for (const [label, pat] of patterns) {
    let count = 0, pos = 0;
    while ((pos = html.indexOf(pat, pos)) >= 0) { count++; pos += pat.length; }
    if (count > 0) console.log('  ' + label + ': ' + count);
  }
  
  // Find the position of the first <script>
  const scriptStart = html.indexOf('<script>');
  console.log('  First <script> at:', scriptStart);
  
  // Find various possible closing tags
  const closes = [
    { name: '</script>', pos: html.indexOf('</script>') },
    { name: "</scr'+'ipt>", pos: html.indexOf("</scr'+'ipt>") },
    { name: '<\\/script>', pos: html.indexOf('<\\/script>') },
  ];
  for (const c of closes) {
    if (c.pos >= 0) console.log('  ' + c.name + ' at:', c.pos);
  }
  
  // Find the </html> close
  const htmlClose = html.lastIndexOf('</html>');
  console.log('  </html> at:', htmlClose);
  
  // Extract and test script content
  const s = html.indexOf('<script>');
  if (s >= 0) {
    // Find what's after <script>
    const afterScript = html.substring(s);
    console.log('  Content after <script> (first 100):', JSON.stringify(afterScript.substring(0, 100)));
    
    // Try to find the script end
    const endScript = html.indexOf('</script>');
    const endSplit = html.indexOf("</scr'+'ipt>");
    
    if (endScript >= 0) {
      const script = html.substring(s + 8, endScript);
      console.log('  Script via </script>: len=' + script.length);
      try {
        new Function(script);
        console.log('  ✅ new Function OK');
      } catch(err) {
        console.log('  ❌ ERROR:', err.message);
      }
    } else if (endSplit >= 0) {
      console.log('  Found split close at', endSplit);
      const script = html.substring(s + 8, endSplit);
      console.log('  Script via split close: len=' + script.length);
      // The split close means the script doesn't have a real </script>
      // Try to evaluate the script anyway
      try {
        new Function(script);
        console.log('  ✅ new Function OK');
      } catch(err) {
        console.log('  ❌ ERROR:', err.message);
      }
    } else {
      console.log('  NO SCRIPT CLOSE FOUND');
    }
  }
  
  // Check what's at the end of the file
  console.log('  Last 200 chars:', JSON.stringify(html.substring(html.length - 200)));
}

analyzePage('HOME', html);
analyzePage('ADMIN', admin);
