import { readFileSync, writeFileSync } from 'fs';
// Write a minimal clean entry point, then test with esbuild
const minimal = `// clean test entry
const APP_VERSION = '20260808-test';
export default {
  async fetch(request, env) {
    return new Response('ok: ' + APP_VERSION);
  }
};
export class ChatRoom {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(request) { return new Response('do'); }
}
`;
writeFileSync('C:/Users/Administrator/.qclaw/workspace-agent-7ac59ebd/chat-app-workers/src/test_entry.js', minimal);
console.log('Written test_entry.js, length:', minimal.length);
