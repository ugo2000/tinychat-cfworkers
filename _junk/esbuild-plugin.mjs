// esbuild plugin: replace </script> in template literals with string concatenation
// "<\/script>" -> "</scr" + "ipt>"
// This prevents esbuild from treating it as an HTML closing tag inside template literals,
// while still rendering correctly in the browser (template eval gives "</script>")
export function scriptTagPlugin() {
  return {
    name: 'script-tag-escape',
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async (args) => {
        const fs = await import('fs');
        let contents = fs.readFileSync(args.path, 'utf8');
        // Only replace </script> that appears inside template literals (backtick strings)
        // We need to be careful: replace "</script>" inside template literals with "</scr"+"ipt>"
        // A safe approach: replace ALL occurrences with string concatenation
        // esbuild processes JSX, template literals, etc. - the concatenation is the safest
        const original = contents;
        // Replace </script> (the full tag) with concatenation that breaks the pattern
        contents = contents.replace(/<\/script>/g, "</scr" + "ipt>");
        if (original !== contents) {
          const n = (original.match(/<\/script>/g)||[]).length;
          console.log('[script-tag] Escaped', n, '</script> in', args.path);
        }
        return { contents, loader: 'js' };
      });
    },
  };
}
