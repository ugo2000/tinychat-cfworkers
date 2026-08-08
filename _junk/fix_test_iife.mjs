import { readFileSync, writeFileSync } from 'fs';
let html = readFileSync('src/html.js', 'utf8');

// Fix TEST_HTML: add }; after run() function closing brace
// Pattern: the run() function ends with `fetch(...);` followed by `\n}\n</script>`
html = html.replace(
  /document\.getElementById\('network error'\);\}\);\n\}\n<\/script>/,
  `document.getElementById('network error');\n  });\n};\n</script>`
);

// Fix ABOUT_HTML IIFE: similar pattern
html = html.replace(
  /src='\/track\?p=about&_='\+Date\.now\(\);\}\(\) \{\}\(\)\);\n\}\n<\/script>/,
  `src='/track?p=about&_='+Date.now();})( );\n};\n</script>`
);

// Let me check the actual pattern more carefully first
const lines = html.split('\n');
// Find lines near the TEST_HTML closing
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("'network error'")) {
    console.log(`L${i+1}: ${lines[i]}`);
    console.log(`L${i+2}: ${lines[i+1] || 'N/A'}`);
    console.log(`L${i+3}: ${lines[i+2] || 'N/A'}`);
    console.log(`L${i+4}: ${lines[i+3] || 'N/A'}`);
  }
  if (lines[i].includes("src='/track?p=about")) {
    console.log(`ABOUT L${i+1}: ${lines[i]}`);
    console.log(`ABOUT L${i+2}: ${lines[i+1] || 'N/A'}`);
    console.log(`ABOUT L${i+3}: ${lines[i+2] || 'N/A'}`);
  }
  if (lines[i].includes("src='/track?p=pricing")) {
    console.log(`PRICING L${i+1}: ${lines[i]}`);
    console.log(`PRICING L${i+2}: ${lines[i+1] || 'N/A'}`);
    console.log(`PRICING L${i+3}: ${lines[i+2] || 'N/A'}`);
  }
}

writeFileSync('src/html.js', html, 'utf8');
console.log('done');
