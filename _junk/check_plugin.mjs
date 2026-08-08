import * as esbuild from '../node_modules/esbuild/lib/main.js';
import { readFileSync } from 'fs';

// Minimal plugin: replace </script> in template literals via string replacement at loader level
function scriptTagPlugin() {
  return {
    name: 'script-tag',
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async (args) => {
        let contents;
        try {
          contents = readFileSync(args.path, 'utf8');
        } catch {
          return null;
        }
        if (!contents.includes('</script>')) return null;
        
        // Replace </script> with string concatenation
        // In template literals: `... </scr${''}ipt> ...` evaluates to `... </script> ...`
        // We need to use a slightly different approach:
        // Replace </script> with </scr" + "ipt> inside template literals
        // But we can't easily detect template literals at this level.
        // 
        // Alternative: use a loader that replaces AFTER esbuild's parsing.
        // But esbuild's JSX parser errors BEFORE our plugin sees the content.
        //
        // REAL solution: the plugin must use onLoad to REPLACE content
        // BEFORE esbuild parses it. But we need to handle the fact that
        // esbuild's JSX parser scans for </script> during INITIAL content reading.
        //
        // Since we can't prevent esbuild's initial scan, we need a different approach.
        // 
        // Actually: esbuild's JSX parser only scans for </script> in the "JSX" context.
        // In regular JS files (no .jsx extension), esbuild should NOT use JSX parsing
        // unless there's JSX syntax. Let me test: if html.js has no JSX, the error
        // should not occur.
        //
        // The error "Expected ; but found ugochat" at line 937 of html.js happens because
        // esbuild's JSX scanner sees `</script>` and thinks the <script> tag is closed,
        // then the rest of the file looks like invalid JS.
        //
        // onLoad replacement BEFORE esbuild's internal processing should work.
        // Let me use a simpler replacement.
        
        const fixed = contents.replace(/<\/script>/g, '</scr' + 'ipt>');
        
        return {
          contents: fixed,
          loader: 'js',
        };
      });
    },
  };
}

const result = await esbuild.build({
  entryPoints: ['src/index.js'],
  outdir: 'dist',
  bundle: true,
  format: 'esm',
  plugins: [scriptTagPlugin()],
  minify: false,
  sourcemap: false,
  logLevel: 'info',
});
console.log('Errors:', result.errors?.length || 0);
if (result.errors?.length) result.errors.forEach(e => console.log('ERROR:', e.text));
else console.log('Build OK');
