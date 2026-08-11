import { readFileSync } from 'fs';
const base = 'C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/';
const bundle = readFileSync(base + 'dist/index.js', 'utf8');
const matches = [];
let pos = 0;
while ((pos = bundle.indexOf('<\/script>', pos)) >= 0) {
  matches.push('ESCAPED at ' + pos + ': ' + JSON.stringify(bundle.substring(pos, pos + 25)));
  pos += 10;
}
console.log('Escaped <\/script>:', matches.length);
matches.slice(0, 5).forEach(m => console.log(m));

const matches2 = [];
pos = 0;
while ((pos = bundle.indexOf('</script>', pos)) >= 0) {
  matches2.push('BARE at ' + pos + ': ' + JSON.stringify(bundle.substring(pos, pos + 25)));
  pos += 9;
}
console.log('Bare </script>:', matches2.length);
matches2.slice(0, 5).forEach(m => console.log(m));
