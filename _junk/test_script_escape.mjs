import { readFileSync, writeFileSync } from 'fs';
const { execSync } = await import('child_process');

// Test: does </\/script> work as a workaround for </script> in CF Workers?
const testCode = `
export default {
  async fetch(request) {
    const html = '<html><body><script>alert(1)</script></body></html>';
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
};
`;

// Write test script
writeFileSync('test_cf_script.mjs', testCode);

// Upload to CF directly
const token = 'cfoat_TNmupkqdJwPiSUSu04UwtJQ67lq78Wxr_6nAQG5QoXo.uKE36ZDQ4Vj0cNQa6Tiv2EXR2lkwtiqL3CY2NpLPvi8';
const account = '40c232b7d826cb8cef7de637e8dc96ed';
const script = 'tinychat-test';

const buf = Buffer.from(testCode, 'utf8');
const http = await import('http');
const https = await import('https');

const payload = JSON.stringify({ script: testCode });

// Use curl instead
const cmd = [
  'curl.exe', '-s', '-X', 'PUT',
  `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${script}`,
  '-H', `Authorization: Bearer ${token}`,
  '-H', 'Content-Type: application/javascript',
  '--data-binary', '@-'
];

const result = execSync('curl.exe -s -X PUT ' +
  `"https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${script}" ` +
  `-H "Authorization: Bearer ${token}" ` +
  '-H "Content-Type: application/javascript" ' +
  '--data-binary @test_cf_script.mjs', { encoding: 'utf8', timeout: 30000 });

console.log('Upload result:', result);
