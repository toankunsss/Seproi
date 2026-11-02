// Copies the web game (repo root) into mobile/www, the folder Capacitor packages into the app.
// The game itself is plain ES modules — no bundler — so this is a straight file copy, plus
// @capacitor/core's prebuilt runtime (www/capacitor.js) which js/platform.js loads on native.
//
// Run: npm run web   (part of `npm run sync`)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '..', 'www');
// Everything the game needs at runtime. Keep in sync with desktop/package.json "extraResources".
const ENTRIES = ['index.html', 'icon.svg', 'manifest.webmanifest', 'css', 'js', 'fonts', 'icons'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const entry of ENTRIES) {
  const from = path.join(ROOT, entry);
  if (!fs.existsSync(from)) { console.warn('  skip (missing) ' + entry); continue; }
  fs.cpSync(from, path.join(OUT, entry), { recursive: true });
}

const core = require.resolve('@capacitor/core/dist/capacitor.js', { paths: [path.join(__dirname, '..')] });
fs.copyFileSync(core, path.join(OUT, 'capacitor.js'));

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .reduce((n, d) => n + (d.isDirectory() ? count(path.join(dir, d.name)) : 1), 0);
console.log(`www/ ready: ${count(OUT)} files`);
