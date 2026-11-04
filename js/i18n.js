// Multi-language support.
//
// Vietnamese is the source language: every UI string is written in Vietnamese in the code and
// wrapped in t(). Other languages are dictionaries "Vietnamese text → translation" in js/lang/.
// A missing entry falls back to the Vietnamese text, so the game never shows a blank.
//
//   t('Quản lý')                        → 'Manage' (English)
//   t('Ngày {n}', { n: 3 })             → 'Day 3'
//
// Only the dictionary of the chosen language is loaded (top-level await below); changing the
// language saves and reloads the page.
//
// Adding a language: copy js/lang/en.js to js/lang/<code>.js, translate the values, check it
// with `node tools/i18n-check.mjs <code>` and add it to LANGS below (docs/PHAT-TRIEN.md).

/** code → { name (in that language), locale (number format), script: 'latin' | 'cjk' | … } */
export const LANGS = {
  vi: { name: 'Tiếng Việt', locale: 'vi-VN', script: 'latin' },
  en: { name: 'English', locale: 'en-US', script: 'latin' },
  es: { name: 'Español', locale: 'es-ES', script: 'latin' },
  pt: { name: 'Português', locale: 'pt-BR', script: 'latin' },
  fr: { name: 'Français', locale: 'fr-FR', script: 'latin' },
  de: { name: 'Deutsch', locale: 'de-DE', script: 'latin' },
  id: { name: 'Bahasa Indonesia', locale: 'id-ID', script: 'latin' },
  ru: { name: 'Русский', locale: 'ru-RU', script: 'cyrillic' },
  th: { name: 'ไทย', locale: 'th-TH', script: 'thai' },
  zh: { name: '简体中文', locale: 'zh-CN', script: 'cjk' },
  ja: { name: '日本語', locale: 'ja-JP', script: 'cjk' },
  ko: { name: '한국어', locale: 'ko-KR', script: 'cjk' },
};

const PREF_KEY = 'seproi.lang'; // kept outside the save so "Chơi lại từ đầu" keeps the language

function detect() {
  try {
    const saved = localStorage.getItem(PREF_KEY);
    if (saved && LANGS[saved]) return saved;
  } catch {}
  for (const nav of navigator.languages || [navigator.language || 'en']) {
    const code = String(nav).toLowerCase().split('-')[0];
    if (LANGS[code]) return code;
    if (code === 'in') return 'id'; // old Android code for Indonesian
  }
  return 'en';
}

let lang = detect();
let dict = null;
if (lang !== 'vi') {
  try { dict = (await import(`./lang/${lang}.js`)).default; }
  catch (err) { console.warn('[i18n] could not load', lang, err); lang = 'en'; dict = (await import('./lang/en.js')).default; }
}
document.documentElement.lang = lang;
document.documentElement.dataset.script = LANGS[lang].script;

export const getLang = () => lang;
export const locale = () => LANGS[lang].locale;

/** Remember the language; the caller reloads the page to apply it. */
export function setLang(code) {
  if (!LANGS[code]) return;
  try { localStorage.setItem(PREF_KEY, code); } catch {}
}

/** Translate a Vietnamese source string, then fill {placeholders} from vars. */
export function t(text, vars) {
  let out = (dict && dict[text]) || text;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return out;
}
