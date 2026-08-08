import { readFileSync } from 'fs';
const s = readFileSync('dist/index.js', 'utf8');
try {
  // Strip export default { since it's not a valid function body
  const stripped = s.replace(/^export default \{[\s\S]*$/, 'export default {}');
  new Function(stripped);
  console.log('Function parse: OK');
} catch(e) {
  console.log('Function parse ERROR:', e.message);
}
