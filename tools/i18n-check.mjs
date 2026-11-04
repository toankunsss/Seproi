// Check a translation file against the English one: same keys, same {placeholders}, same HTML tags.
//   node tools/i18n-check.mjs es        (checks js/lang/es.js)
import { pathToFileURL } from 'url';
import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const code = process.argv[2];
const load = async (c) => (await import(pathToFileURL(path.join(root, 'js/lang', c + '.js')).href + '?' + Date.now())).default;
const en = await load('en'), tr = await load(code);
const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
const tags = (s) => (s.match(/<\/?[a-z]+[^>]*>/gi) || []).map((x) => x.replace(/\s.*?>/, '>').toLowerCase()).sort().join(',');
let bad = 0;
const missing = Object.keys(en).filter((k) => !(k in tr));
const extra = Object.keys(tr).filter((k) => !(k in en));
for (const k of missing) { bad++; console.log('MISSING', JSON.stringify(k)); }
for (const k of extra) { bad++; console.log('EXTRA  ', JSON.stringify(k)); }
for (const k of Object.keys(en)) {
  if (!(k in tr)) continue;
  const v = tr[k];
  if (typeof v !== 'string' || !v.trim()) { bad++; console.log('EMPTY  ', JSON.stringify(k)); continue; }
  if (ph(v) !== ph(en[k])) { bad++; console.log('PLACEH ', JSON.stringify(k), '→', JSON.stringify(v)); }
  if (tags(v) !== tags(en[k])) { bad++; console.log('TAGS   ', JSON.stringify(k), '→', JSON.stringify(v)); }
}
const same = Object.keys(en).filter((k) => tr[k] === en[k] && /[a-z]{4}/i.test(en[k])).length;
console.log(`${code}: ${Object.keys(tr).length}/${Object.keys(en).length} keys, ${bad} problems, ${same} values identical to English`);
process.exit(bad ? 1 : 0);
