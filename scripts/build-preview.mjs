// Builds a self-contained web preview of the app that works when hosted under any path
// (for example as a private Claude artifact). The real target is still the iPhone app.
//
//   npm run build:preview   →   dist-preview/
//
// What it does after `expo export -p web`:
//  - makes every script, chunk and asset path relative instead of rooted at "/"
//  - writes page.html: a page fragment that pins a <base> to wherever it is served,
//    resets the address path to "/" so Expo Router starts on the Items screen,
//    then loads the app scripts
//  - copies only the files the app actually uses (Ionicons is the only icon font)

import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = join(dirname(new URL(import.meta.url).pathname), '..');
const dist = join(root, 'dist');
const out = join(root, 'dist-preview');

execSync('npx expo export -p web', { cwd: root, stdio: 'inherit' });
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const keep = (rel) =>
  rel.startsWith('_expo/') ||
  rel.startsWith('assets/node_modules/expo-router/') ||
  rel.includes('/Fonts/Ionicons.') ||
  rel.startsWith('assets/assets/');

const files = [];
for (const abs of walk(dist)) {
  const rel = relative(dist, abs);
  if (!keep(rel)) continue;
  // The artifact host reserves names starting with "_", so _expo/ becomes app/.
  const dest = join(out, rel.replace(/^_expo\//, 'app/'));
  mkdirSync(dirname(dest), { recursive: true });
  if (rel.endsWith('.js') || rel.endsWith('.css')) {
    const text = readFileSync(abs, 'utf8')
      .replaceAll('"/_expo/', '"app/')
      .replaceAll('"/assets/', '"assets/')
      // Lazy screen chunks resolve against the page address; use the pinned <base> instead.
      .replaceAll('url:location.origin+location.pathname', 'url:document.baseURI');
    writeFileSync(dest, text);
  } else {
    cpSync(abs, dest);
  }
  files.push(rel.replace(/^_expo\//, 'app/'));
}

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const toApp = (p) => p.replace(/^_expo\//, 'app/');
const scripts = [...html.matchAll(/<script src="\/([^"]+)" defer><\/script>/g)].map((m) => toApp(m[1]));
const styles = [...html.matchAll(/<link rel="stylesheet" href="\/([^"]+)">/g)].map((m) => toApp(m[1]));

const page = `<title>Itemlogger</title>
<meta name="description" content="Home inventory and warranty vault: web preview of the iPhone app.">
<style>
  :root { --bg: #ffffff; color-scheme: light; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #000000; color-scheme: dark; } }
  :root[data-theme="dark"] { --bg: #000000; color-scheme: dark; }
  html, body { height: 100%; }
  body { overflow: hidden; background: var(--bg); }
  #root { display: flex; height: 100%; flex: 1; }
</style>
${styles.map((s) => `<link rel="stylesheet" href="${s}">`).join('\n')}
<div id="root"></div>
<script>
  // Resolve the app's files relative to wherever this page is served,
  // then start the app on its home route.
  (function () {
    var here = location.href.split('#')[0].split('?')[0];
    var base = document.createElement('base');
    base.href = here.slice(0, here.lastIndexOf('/') + 1);
    document.head.appendChild(base);
    try { history.replaceState(null, '', '/'); } catch (e) {}
  })();
</script>
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
`;
writeFileSync(join(out, 'page.html'), page);

console.log(`\nPreview: ${files.length} files + page.html in dist-preview/`);
