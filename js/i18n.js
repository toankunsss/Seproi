// Multi-language support.
//
// Vietnamese is the source language: every UI string is written in Vietnamese in the code and
// wrapped in t(). Other languages are dictionaries "Vietnamese text → translation" in js/lang/.
// A missing entry falls back to the Vietnamese text, so the game never shows a blank.
//
//   t('Quản lý')                        → 'Manage' (English)
//   t('Ngày {n}', { n: 3 })             → 'Day 3'
//
// Adding a language: copy js/lang/en.js to js/lang/<code>.js, translate the values, and add it
// to LANGS below (docs/PHAT-TRIEN.md → "Đa ngôn ngữ").
import en from './lang/en.js';

export const LANGS = {
  vi: { name: 'Tiếng Việt', dict: null, locale: 'vi-VN' },
  en: { name: 'English', dict: en, locale: 'en-US' },
};

const PREF_KEY = 'seproi.lang'; // kept outside the save so "Chơi lại từ đầu" keeps the language

function detect() {
  try {
    const saved = localStorage.getItem(PREF_KEY);
    if (saved && LANGS[saved]) return saved;
  } catch {}
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'vi';
  const code = nav.toLowerCase().split('-')[0];
  return LANGS[code] ? code : code === 'vi' ? 'vi' : 'en';
}

let lang = detect();
document.documentElement.lang = lang;

export const getLang = () => lang;
export const locale = () => LANGS[lang].locale;

export function setLang(code) {
  if (!LANGS[code]) return;
  lang = code;
  try { localStorage.setItem(PREF_KEY, code); } catch {}
  document.documentElement.lang = code;
}

/** Translate a Vietnamese source string, then fill {placeholders} from vars. */
export function t(text, vars) {
  const dict = LANGS[lang].dict;
  let out = (dict && dict[text]) || text;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return out;
}
