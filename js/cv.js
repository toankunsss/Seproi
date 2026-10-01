// Recruitment: generates varied CVs, optionally matching a job request (name / role / grade).
import { ROLES, ROLE_KEYS, GRADES, GRADE_KEYS, HIRE_FEE, CV_POOL as P, TRAITS, LOOKS } from './config.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

const GOOD = Object.keys(TRAITS).filter((k) => TRAITS[k].good);
const BAD = Object.keys(TRAITS).filter((k) => !TRAITS[k].good);

/** "lan" → "Lan", "  thu   hà " → "Thu Hà" */
export function tidyName(s) {
  return String(s || '').trim().replace(/\s+/g, ' ').slice(0, 24)
    .split(' ').filter(Boolean).map((w) => w[0].toLocaleUpperCase('vi') + w.slice(1).toLocaleLowerCase('vi')).join(' ');
}

/** Combined effect of a list of trait keys. */
export function traitStats(keys = []) {
  const s = { slack: 1, stress: 1, prod: 1, fav: null };
  for (const k of keys) {
    const t = TRAITS[k];
    if (!t) continue;
    if (t.slack) s.slack *= t.slack;
    if (t.stress) s.stress *= t.stress;
    if (t.prod) s.prod *= t.prod;
    if (t.fav) s.fav = t.fav;
  }
  return s;
}

/**
 * One CV. `req` = { name?, role?, grade? } from a job posting; empty fields mean "any".
 * A requested name becomes the given name (or the last words of the full name).
 */
export function makeCV(req = {}, uid = 0) {
  const role = ROLES[req.role] ? req.role : pick(ROLE_KEYS);
  const grade = GRADES[req.grade] ? req.grade : pick(['intern', 'junior', 'junior', 'senior', 'senior', 'lead']);
  const G = GRADES[grade];

  const wanted = tidyName(req.name);
  let given = pick(P.given), middle = pick(P.middle);
  if (wanted) {
    const parts = wanted.split(' ');
    given = parts.pop();
    if (parts.length) middle = parts.join(' ');
  }
  const family = pick(P.family);
  const name = `${family} ${middle} ${given}`;

  const years = randInt(G.years[0], G.years[1]);
  const age = Math.min(55, 20 + years + randInt(0, 4));
  const traits = [pick(GOOD), pick(BAD)];
  // Salary: role base × grade, ±15%, plus a little for experience; rounded to 50.
  const salary = Math.round((ROLES[role].salary * G.pay * (0.85 + Math.random() * 0.3) + years * 40) / 50) * 50;
  const look = {
    skin: pick(LOOKS.skin), hair: pick(LOOKS.hair), shirt: pick(LOOKS.shirt), style: pick(LOOKS.style),
  };

  return {
    uid, name, short: given, role, grade, age, years, salary,
    fee: Math.round(salary * HIRE_FEE / 10) * 10,
    school: pick(P.school),
    company: years === 0 ? 'Chưa đi làm ở đâu' : pick(P.company),
    skills: shuffle(P.skills[role]).slice(0, 3),
    hobby: pick(P.hobby),
    quote: pick(P.quote),
    traits, look,
    matched: !!wanted,
  };
}

export function makeCVs(req, count, nextUid) {
  return Array.from({ length: count }, (_, i) => makeCV(req, nextUid + i));
}

/** Expected income per second at full work, used to show a rough "năng suất" on the CV. */
export function cvOutput(cv) {
  return ROLES[cv.role].income * GRADES[cv.grade].prod * traitStats(cv.traits).prod;
}
